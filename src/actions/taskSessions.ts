"use server";

import { revalidatePath } from "next/cache";

import { formatSupabaseError } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/types/supabase";

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");
  return { supabase, userId: user.id };
}

export async function createTaskSession(
  row: TablesInsert<"task_sessions"> & { id: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { supabase, userId } = await requireUser();
    const { data: task, error: tErr } = await supabase
      .from("tasks")
      .select("id")
      .eq("id", row.task_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (tErr) throw tErr;
    if (!task) {
      return { ok: false, error: "Task not found" };
    }

    const { error } = await supabase.from("task_sessions").insert({
      id: row.id,
      task_id: row.task_id,
      start_time: row.start_time,
      end_time: row.end_time ?? null,
      duration_seconds: row.duration_seconds ?? null,
    });
    if (error) throw error;
    revalidatePath("/");
    revalidatePath("/daily-log");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export type TaskSessionWithTaskMeta = {
  id: string;
  task_id: string;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  created_at: string | null;
  task_name: string | null;
  microtopic_id: string | null;
  assigned_date: string | null;
  task_status: string | null;
};

/**
 * Long-range history for execution log (server-side; respects RLS).
 */
export async function fetchTaskSessionsForLog(
  sinceIso: string,
  limit = 8000,
): Promise<
  { ok: true; rows: TaskSessionWithTaskMeta[] } | { ok: false; error: string }
> {
  try {
    const { supabase } = await requireUser();

    const { data, error } = await supabase.rpc("fetch_task_sessions_for_log", {
      p_since: sinceIso,
      p_limit: limit,
    });
    if (error) throw error;

    const rows: TaskSessionWithTaskMeta[] = (data ?? []).map((r) => ({
      id: r.id,
      task_id: r.task_id,
      start_time: r.start_time,
      end_time: r.end_time,
      duration_seconds: r.duration_seconds,
      created_at: r.created_at,
      task_name: r.task_name,
      microtopic_id: r.microtopic_id,
      assigned_date: r.assigned_date,
      task_status: r.task_status,
    }));

    return { ok: true, rows };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}
