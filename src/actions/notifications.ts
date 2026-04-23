"use server";

import { format } from "date-fns";

import { formatSupabaseError } from "@/lib/supabase";
import {
  resolveNotificationFeature,
  type NotificationFeatureId,
} from "@/lib/notificationFeatureTags";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/types/supabase";

type NotificationKind = "reminder" | "deadline" | "streak";

export type UserNotification = {
  id: string;
  title: string;
  message: string;
  kind: NotificationKind;
  created_at: string;
  read: boolean;
  /** Product area: derived from title/kind, used for feature pills and filters. */
  feature: NotificationFeatureId;
};

export type { NotificationFeatureId } from "@/lib/notificationFeatureTags";

/** PostgREST: table not exposed or not created yet (run migration in Supabase). */
function isUserNotificationsTableMissing(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  if (e.code === "PGRST205") return true;
  const m = (e.message ?? "").toLowerCase();
  return (
    m.includes("user_notifications") &&
    (m.includes("schema cache") || m.includes("could not find"))
  );
}

function todayRangeUtc() {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
  );
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

async function insertIfMissingToday(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  kind: NotificationKind,
  title: string,
  message: string,
) {
  const { startIso, endIso } = todayRangeUtc();
  const { count, error: countError } = await supabase
    .from("user_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", kind)
    .eq("title", title)
    .gte("created_at", startIso)
    .lte("created_at", endIso);
  if (countError) {
    if (isUserNotificationsTableMissing(countError)) {
      console.log(
        "[user_notifications] table missing; skip insert until migration is applied",
        countError,
      );
      return;
    }
    throw countError;
  }
  if ((count ?? 0) > 0) return;

  const row: TablesInsert<"user_notifications"> = {
    user_id: userId,
    kind,
    title,
    message,
    read: false,
  };
  const { error } = await supabase.from("user_notifications").insert(row);
  if (error) {
    if (isUserNotificationsTableMissing(error)) {
      console.log(
        "[user_notifications] table missing; skip insert until migration is applied",
        error,
      );
      return;
    }
    throw error;
  }
}

export async function ensureAutomatedNotifications(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return { ok: true };

    const today = format(new Date(), "yyyy-MM-dd");

    const [{ count: incompleteTaskCount, error: incompleteCountError }, { data: todayTasks, error: dayErr }, { data: streakRows, error: streakErr }] =
      await Promise.all([
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .neq("status", "completed"),
        supabase
          .from("tasks")
          .select("id, status")
          .eq("user_id", user.id)
          .eq("assigned_date", today),
        supabase
          .from("tasks")
          .select("assigned_date")
          .eq("user_id", user.id)
          .eq("status", "completed")
          .gte("assigned_date", format(new Date(Date.now() - 1000 * 60 * 60 * 24 * 30), "yyyy-MM-dd"))
          .order("assigned_date", { ascending: false }),
      ]);
    if (incompleteCountError) throw incompleteCountError;
    if (dayErr) throw dayErr;
    if (streakErr) throw streakErr;

    const incompleteTasks = incompleteTaskCount ?? 0;
    await insertIfMissingToday(
      supabase,
      user.id,
      "reminder",
      "Open tasks reminder",
      incompleteTasks > 0
        ? `You have ${incompleteTasks} incomplete task${incompleteTasks === 1 ? "" : "s"} in your plan. Start with one high-impact task now.`
        : "No incomplete tasks in your backlog right now. Great momentum — keep it up.",
    );

    const totalToday = todayTasks?.length ?? 0;
    const completedToday = (todayTasks ?? []).filter((t) => t.status === "completed").length;
    await insertIfMissingToday(
      supabase,
      user.id,
      "deadline",
      "Daily progress summary",
      totalToday > 0
        ? `Today's progress: ${completedToday}/${totalToday} tasks completed.`
        : "No tasks scheduled for today yet. Add a small target to stay consistent.",
    );

    const completedDays = new Set((streakRows ?? []).map((r) => r.assigned_date));
    let streak = 0;
    let cursor = new Date();
    while (streak < 30) {
      const key = format(cursor, "yyyy-MM-dd");
      if (!completedDays.has(key)) break;
      streak += 1;
      cursor = new Date(cursor.getTime() - 1000 * 60 * 60 * 24);
    }
    if (streak >= 2) {
      await insertIfMissingToday(
        supabase,
        user.id,
        "streak",
        "Streak alert",
        `You're on a ${streak}-day completion streak. Protect it today.`,
      );
    }

    return { ok: true };
  } catch (e) {
    console.error("[ensureAutomatedNotifications] failed", e);
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function listUserNotifications(
  limit = 40,
): Promise<{ ok: true; notifications: UserNotification[] } | { ok: false; error: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return { ok: true, notifications: [] };

    const { data, error } = await supabase
      .from("user_notifications")
      .select("id, title, message, kind, created_at, read")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(Math.max(1, Math.min(100, limit)));
    if (error) {
      console.log("[listUserNotifications] query error", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        full: error,
      });
      if (isUserNotificationsTableMissing(error)) {
        console.log(
          "[listUserNotifications] user_notifications not in DB yet — returning empty list (apply supabase migration)",
        );
        return { ok: true, notifications: [] };
      }
      throw error;
    }

    const rows = data ?? [];
    return {
      ok: true,
      notifications: rows.map((row) => {
        const r = row as {
          id: string;
          title: string;
          message: string;
          kind: string;
          created_at: string;
          read: boolean;
        };
        return {
          ...r,
          kind: r.kind as NotificationKind,
          feature: resolveNotificationFeature(r.title, r.kind),
        };
      }),
    };
  } catch (e) {
    console.error("[listUserNotifications] failed", e);
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function clearAllUserNotifications(): Promise<
  { ok: true; deleted: number } | { ok: false; error: string }
> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { ok: false, error: "Not signed in." };
    }

    const { data, error } = await supabase
      .from("user_notifications")
      .delete()
      .eq("user_id", user.id)
      .select("id");
    if (error) {
      if (isUserNotificationsTableMissing(error)) {
        return { ok: true, deleted: 0 };
      }
      throw error;
    }
    return { ok: true, deleted: (data ?? []).length };
  } catch (e) {
    console.error("[clearAllUserNotifications] failed", e);
    return { ok: false, error: formatSupabaseError(e) };
  }
}
