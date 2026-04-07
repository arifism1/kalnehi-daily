"use server";

import { revalidatePath } from "next/cache";

import type { HabitOutboxOp } from "@/lib/habitTypes";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatSupabaseError } from "@/lib/supabase";
import { USER_ERROR } from "@/lib/userFacingErrors";
import type { TablesInsert } from "@/types/supabase";

export type HabitsDataResult =
  | {
      ok: true;
      habits: import("@/types/supabase").Tables<"user_habits">[];
      logs: import("@/types/supabase").Tables<"habit_logs">[];
    }
  | { ok: false; error: string };

export async function fetchHabitsData(): Promise<HabitsDataResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return { ok: false, error: USER_ERROR.session };

    const [habitsRes, logsRes] = await Promise.all([
      supabase
        .from("user_habits")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("habit_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("log_date", { ascending: false })
        .limit(800),
    ]);

    if (habitsRes.error)
      return { ok: false, error: formatSupabaseError(habitsRes.error) };
    if (logsRes.error)
      return { ok: false, error: formatSupabaseError(logsRes.error) };

    return {
      ok: true,
      habits: habitsRes.data ?? [],
      logs: logsRes.data ?? [],
    };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function createUserHabit(input: {
  id?: string;
  name: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return { ok: false, error: USER_ERROR.session };

    const name = input.name.trim().slice(0, 200);
    if (!name) return { ok: false, error: "Enter a habit name." };

    const id = input.id ?? crypto.randomUUID();
    const now = new Date().toISOString();
    const row: TablesInsert<"user_habits"> = {
      id,
      user_id: user.id,
      name,
      created_at: now,
      updated_at: now,
    };
    const { error } = await supabase.from("user_habits").insert(row);
    if (error) {
      if (error.code === "23505") return { ok: true, id };
      return { ok: false, error: formatSupabaseError(error) };
    }
    revalidatePath("/habits");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function upsertHabitLogEntry(input: {
  id?: string;
  habitId: string;
  logDate: string;
  completed: boolean;
  comment: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return { ok: false, error: USER_ERROR.session };

    const logDate = input.logDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate)) {
      return { ok: false, error: "Invalid date." };
    }

    const id = input.id ?? crypto.randomUUID();
    const now = new Date().toISOString();
    const comment =
      input.comment == null
        ? null
        : input.comment.trim().slice(0, 1_000) || null;

    const row: TablesInsert<"habit_logs"> = {
      id,
      user_id: user.id,
      habit_id: input.habitId,
      log_date: logDate,
      completed: input.completed,
      comment,
      created_at: now,
      updated_at: now,
    };

    const { error } = await supabase.from("habit_logs").upsert(row, {
      onConflict: "user_id,habit_id,log_date",
    });
    if (error) return { ok: false, error: formatSupabaseError(error) };

    revalidatePath("/habits");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function applyHabitOutboxOp(
  op: HabitOutboxOp,
): Promise<{ ok: true } | { ok: false; error: string }> {
  switch (op.kind) {
    case "habit_create": {
      const r = await createUserHabit({ id: op.id, name: op.name });
      return r.ok ? { ok: true } : { ok: false, error: r.error };
    }
    case "habit_log_upsert": {
      const r = await upsertHabitLogEntry({
        id: op.logId,
        habitId: op.habitId,
        logDate: op.logDate,
        completed: op.completed,
        comment: op.comment,
      });
      return r.ok ? { ok: true } : { ok: false, error: r.error };
    }
    default:
      return { ok: false, error: "Unknown habit sync operation." };
  }
}
