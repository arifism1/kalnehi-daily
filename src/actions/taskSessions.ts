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
    const { supabase, userId } = await requireUser();

    const { data: taskRows, error: tidErr } = await supabase
      .from("tasks")
      .select("id, name, microtopic_id, assigned_date, status")
      .eq("user_id", userId);
    if (tidErr) throw tidErr;
    const tasks = taskRows ?? [];
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const ids = tasks.map((t) => t.id);
    if (ids.length === 0) {
      return { ok: true, rows: [] };
    }

    const chunkSize = 90;
    const sessions: {
      id: string;
      task_id: string;
      start_time: string;
      end_time: string | null;
      duration_seconds: number | null;
      created_at: string | null;
    }[] = [];

    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const { data: part, error: sErr } = await supabase
        .from("task_sessions")
        .select("*")
        .in("task_id", chunk)
        .gte("end_time", sinceIso)
        .order("end_time", { ascending: false })
        .limit(limit);
      if (sErr) throw sErr;
      for (const s of part ?? []) sessions.push(s);
      if (sessions.length >= limit) break;
    }

    sessions.sort((a, b) => {
      const ea = a.end_time ?? "";
      const eb = b.end_time ?? "";
      return eb.localeCompare(ea);
    });
    const capped = sessions.slice(0, limit);

    const rows: TaskSessionWithTaskMeta[] = capped.map((s) => {
      const t = taskMap.get(s.task_id);
      return {
        id: s.id,
        task_id: s.task_id,
        start_time: s.start_time,
        end_time: s.end_time,
        duration_seconds: s.duration_seconds,
        created_at: s.created_at,
        task_name: t?.name ?? null,
        microtopic_id: t?.microtopic_id ?? null,
        assigned_date: t?.assigned_date ?? null,
        task_status: t?.status ?? null,
      };
    });

    return { ok: true, rows };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}
