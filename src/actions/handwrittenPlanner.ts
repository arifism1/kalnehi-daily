"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { USER_ERROR } from "@/lib/userFacingErrors";
import type { Json, Tables, TablesInsert } from "@/types/supabase";

export type HandwrittenPlannerRow = Tables<"handwritten_planner_entries">;

/** Use `activityName` (not `name`) so the value is never stripped or confused by tooling. */
export type SaveHandwrittenTaskInput = {
  activityName: string;
  start_time: string | null;
  end_time: string | null;
  duration: string | null;
};

export async function listHandwrittenPlannerForDate(
  logDate: string,
): Promise<
  { ok: true; entries: HandwrittenPlannerRow[] } | { ok: false; error: string; entries: [] }
> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate)) {
    return { ok: false, error: "Invalid date.", entries: [] };
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: USER_ERROR.session, entries: [] };

  const { data, error } = await supabase
    .from("handwritten_planner_entries")
    .select("*")
    .eq("user_id", user.id)
    .eq("log_date", logDate)
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: USER_ERROR.tryAgain, entries: [] };
  return { ok: true, entries: (data ?? []) as HandwrittenPlannerRow[] };
}

export async function saveHandwrittenPlannerRows(
  input: {
    log_date: string;
    source_text: string;
    tasks: SaveHandwrittenTaskInput[];
  },
): Promise<{ ok: true; ids: string[] } | { ok: false; error: string }> {
  const logDate = input.log_date?.trim() ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate)) return { ok: false, error: "Invalid date." };

  const sourceText = (input.source_text ?? "").trim().slice(0, 30_000);
  const cleaned = input.tasks
    .map((t) => ({
      activityName: String(t.activityName ?? "")
        .trim()
        .slice(0, 200),
      start_time: t.start_time?.trim() || null,
      end_time: t.end_time?.trim() || null,
      duration: t.duration?.trim() || null,
    }))
    .filter((t) => t.activityName.length > 0);

  if (cleaned.length === 0) {
    return { ok: false, error: "Add at least one row to save." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: USER_ERROR.session };

  const rows: TablesInsert<"handwritten_planner_entries">[] = cleaned.map((t) => ({
    user_id: user.id,
    log_date: logDate,
    source_text: sourceText,
    title: t.activityName,
    start_time: t.start_time,
    end_time: t.end_time,
    duration: t.duration,
    parsed_json: {
      activityName: t.activityName,
      start_time: t.start_time,
      end_time: t.end_time,
      duration: t.duration,
      source: "paste_handwritten_plan",
    } as Json,
  }));

  const { data, error } = await supabase
    .from("handwritten_planner_entries")
    .insert(rows)
    .select("id");

  if (error) return { ok: false, error: USER_ERROR.tryAgain };

  revalidatePath("/");
  revalidatePath("/daily-plan");
  return { ok: true, ids: (data ?? []).map((r) => r.id) };
}

/**
 * Replace all handwritten rows for a date (delete existing, then insert).
 * Used for debounced autosave so repeated saves do not duplicate rows.
 */
export async function replaceHandwrittenPlannerForDate(
  input: {
    log_date: string;
    source_text: string;
    tasks: SaveHandwrittenTaskInput[];
  },
): Promise<{ ok: true; ids: string[] } | { ok: false; error: string }> {
  const logDate = input.log_date?.trim() ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate)) return { ok: false, error: "Invalid date." };

  const sourceText = (input.source_text ?? "").trim().slice(0, 30_000);
  const cleaned = input.tasks
    .map((t) => ({
      activityName: String(t.activityName ?? "")
        .trim()
        .slice(0, 200),
      start_time: t.start_time?.trim() || null,
      end_time: t.end_time?.trim() || null,
      duration: t.duration?.trim() || null,
    }))
    .filter((t) => t.activityName.length > 0);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: USER_ERROR.session };

  const { error: delErr } = await supabase
    .from("handwritten_planner_entries")
    .delete()
    .eq("user_id", user.id)
    .eq("log_date", logDate);

  if (delErr) return { ok: false, error: USER_ERROR.tryAgain };

  if (cleaned.length === 0) {
    revalidatePath("/");
    revalidatePath("/daily-plan");
    return { ok: true, ids: [] };
  }

  const rows: TablesInsert<"handwritten_planner_entries">[] = cleaned.map((t) => ({
    user_id: user.id,
    log_date: logDate,
    source_text: sourceText,
    title: t.activityName,
    start_time: t.start_time,
    end_time: t.end_time,
    duration: t.duration,
    parsed_json: {
      activityName: t.activityName,
      start_time: t.start_time,
      end_time: t.end_time,
      duration: t.duration,
      source: "paste_handwritten_plan",
      planner_include: true,
    } as Json,
  }));

  const { data, error } = await supabase
    .from("handwritten_planner_entries")
    .insert(rows)
    .select("id");

  if (error) return { ok: false, error: USER_ERROR.tryAgain };

  revalidatePath("/");
  revalidatePath("/daily-plan");
  return { ok: true, ids: (data ?? []).map((r) => r.id) };
}
