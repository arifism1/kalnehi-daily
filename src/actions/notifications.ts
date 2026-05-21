"use server";

import { after } from "next/server";
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

type PlannedAutomatedNotification = {
  kind: NotificationKind;
  title: string;
  message: string;
};

async function insertAutomatedNotificationsIfMissing(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  planned: PlannedAutomatedNotification[],
): Promise<void> {
  if (planned.length === 0) return;

  const { startIso, endIso } = todayRangeUtc();

  const { data: existing, error: selectError } = await supabase
    .from("user_notifications")
    .select("kind, title")
    .eq("user_id", userId)
    .gte("created_at", startIso)
    .lte("created_at", endIso);

  if (selectError) {
    if (isUserNotificationsTableMissing(selectError)) {
      after(() =>
        // react-doctor-disable-next-line react-doctor/server-after-nonblocking
        console.log(
          "[user_notifications] table missing; skip insert until migration is applied",
          selectError,
        ),
      );
      return;
    }
    throw selectError;
  }

  const present = new Set(
    (existing ?? []).map((r) => `${(r as { kind: string }).kind}\0${(r as { title: string }).title}`),
  );

  const toInsert: TablesInsert<"user_notifications">[] = [];
  for (const p of planned) {
    if (present.has(`${p.kind}\0${p.title}`)) continue;
    toInsert.push({
      user_id: userId,
      kind: p.kind,
      title: p.title,
      message: p.message,
      read: false,
    });
  }

  if (toInsert.length === 0) return;

  const { error } = await supabase.from("user_notifications").insert(toInsert);
  if (error) {
    if (isUserNotificationsTableMissing(error)) {
      after(() =>
        // react-doctor-disable-next-line react-doctor/server-after-nonblocking
        console.log(
          "[user_notifications] table missing; skip insert until migration is applied",
          error,
        ),
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

    const { data: signalRows, error: signalErr } = await supabase.rpc(
      "automated_notification_task_signals",
      { p_today: today },
    );
    if (signalErr) throw signalErr;

    const sig = signalRows?.[0];
    if (!sig) {
      throw new Error("automated_notification_task_signals returned no row");
    }

    const incompleteTasks = Number(sig.incomplete_task_count) || 0;
    const totalToday = Number(sig.today_task_total) || 0;
    const completedToday = Number(sig.today_task_completed) || 0;
    const streak = Number(sig.completion_streak) || 0;

    const planned: PlannedAutomatedNotification[] = [
      {
        kind: "reminder",
        title: "Open tasks reminder",
        message:
          incompleteTasks > 0
            ? `You have ${incompleteTasks} incomplete task${incompleteTasks === 1 ? "" : "s"} in your plan. Start with one high-impact task now.`
            : "No incomplete tasks in your backlog right now. Great momentum — keep it up.",
      },
      {
        kind: "deadline",
        title: "Daily progress summary",
        message:
          totalToday > 0
            ? `Today's progress: ${completedToday}/${totalToday} tasks completed.`
            : "No tasks scheduled for today yet. Add a small target to stay consistent.",
      },
    ];

    if (streak >= 2) {
      planned.push({
        kind: "streak",
        title: "Streak alert",
        message: `You're on a ${streak}-day completion streak. Protect it today.`,
      });
    }

    await insertAutomatedNotificationsIfMissing(supabase, user.id, planned);

    return { ok: true };
  } catch (e) {
    console.error("[ensureAutomatedNotifications] failed", e);
    return { ok: false, error: formatSupabaseError(e) };
  }
}

function mapUserNotificationRows(rows: unknown[]): UserNotification[] {
  return rows.map((row) => {
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
  });
}

/**
 * Paginated list: fetches `take + 1` rows to detect `hasMore`, returns at most `take` items.
 * Ordering is `created_at` descending; `offset` is the skip count in that order.
 */
export async function listUserNotificationsPage(
  offset: number,
  take: number,
): Promise<
  { ok: true; items: UserNotification[]; hasMore: boolean } | { ok: false; error: string }
> {
  try {
    const safeOffset = Math.max(0, Math.floor(offset));
    const safeTake = Math.min(50, Math.max(1, Math.floor(take)));
    const fetchSize = safeTake + 1;
    const rangeEnd = safeOffset + fetchSize - 1;

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return { ok: true, items: [], hasMore: false };

    const { data, error } = await supabase
      .from("user_notifications")
      .select("id, title, message, kind, created_at, read")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(safeOffset, rangeEnd);
    if (error) {
      after(() =>
        // react-doctor-disable-next-line react-doctor/server-after-nonblocking
        console.log("[listUserNotificationsPage] query error", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          full: error,
        }),
      );
      if (isUserNotificationsTableMissing(error)) {
        after(() =>
          // react-doctor-disable-next-line react-doctor/server-after-nonblocking
          console.log(
            "[listUserNotificationsPage] user_notifications not in DB yet — returning empty list (apply supabase migration)",
          ),
        );
        return { ok: true, items: [], hasMore: false };
      }
      throw error;
    }

    const rows = data ?? [];
    const hasMore = rows.length > safeTake;
    const slice = hasMore ? rows.slice(0, safeTake) : rows;
    return {
      ok: true,
      items: mapUserNotificationRows(slice),
      hasMore,
    };
  } catch (e) {
    console.error("[listUserNotificationsPage] failed", e);
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function getNotificationUnreadTotal(): Promise<
  { ok: true; total: number } | { ok: false; error: string }
> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return { ok: true, total: 0 };

    let generalUnread = 0;
    const { count: generalCount, error: generalError } = await supabase
      .from("user_notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false);
    if (generalError) {
      if (!isUserNotificationsTableMissing(generalError)) throw generalError;
    } else {
      generalUnread = generalCount ?? 0;
    }

    const { count: totalUpdates, error: totalErr } = await supabase
      .from("app_updates")
      .select("*", { count: "exact", head: true });
    if (totalErr) throw totalErr;

    const { count: readUpdates, error: readErr } = await supabase
      .from("user_app_update_reads")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    if (readErr) throw readErr;

    const updatesUnread = Math.max(0, (totalUpdates ?? 0) - (readUpdates ?? 0));

    return { ok: true, total: generalUnread + updatesUnread };
  } catch (e) {
    console.error("[getNotificationUnreadTotal] failed", e);
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

export async function markAllGeneralNotificationsRead(): Promise<
  { ok: true; updated: number } | { ok: false; error: string }
> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return { ok: false, error: "Not signed in." };

    const { data, error } = await supabase
      .from("user_notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false)
      .select("id");
    if (error) {
      if (isUserNotificationsTableMissing(error)) return { ok: true, updated: 0 };
      throw error;
    }
    return { ok: true, updated: (data ?? []).length };
  } catch (e) {
    console.error("[markAllGeneralNotificationsRead] failed", e);
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export type AppUpdate = {
  id: string;
  title: string;
  message: string;
  category: string;
  created_at: string;
  read: boolean;
};

export async function listAppUpdates(
  limit = 50,
): Promise<{ ok: true; updates: AppUpdate[] } | { ok: false; error: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return { ok: true, updates: [] };

    // Single round-trip: PostgREST embeds user_app_update_reads as a LEFT JOIN.
    // RLS on user_app_update_reads filters to auth.uid() = user_id automatically,
    // so the embedded array is empty if unread, non-empty if read by this user.
    const { data, error } = await supabase
      .from("app_updates")
      .select("id, title, message, category, created_at, user_app_update_reads(update_id)")
      .order("created_at", { ascending: false })
      .limit(Math.max(1, Math.min(200, limit)));

    if (error) throw error;

    type RawRow = {
      id: string;
      title: string;
      message: string;
      category: string;
      created_at: string;
      user_app_update_reads: { update_id: string }[];
    };

    const updates: AppUpdate[] = ((data ?? []) as unknown as RawRow[]).map((row) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      category: row.category,
      created_at: row.created_at,
      read: Array.isArray(row.user_app_update_reads) && row.user_app_update_reads.length > 0,
    }));

    return { ok: true, updates };
  } catch (e) {
    console.error("[listAppUpdates] failed", e);
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function markAllAppUpdatesRead(
  ids: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (ids.length === 0) return { ok: true };
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return { ok: false, error: "Not signed in." };

    const rows = ids.map((update_id) => ({ user_id: user.id, update_id }));
    const { error } = await supabase
      .from("user_app_update_reads")
      .upsert(rows, { onConflict: "user_id,update_id" });
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.error("[markAllAppUpdatesRead] failed", e);
    return { ok: false, error: formatSupabaseError(e) };
  }
}
