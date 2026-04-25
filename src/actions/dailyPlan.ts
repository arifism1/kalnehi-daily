"use server";

import { revalidatePath } from "next/cache";

import { normalizeSyllabusMasterIdForDb } from "@/lib/dailyPlanSyllabusId";
import {
  assertSyllabusBelongsToUserExam,
  SyllabusExamScopeError,
} from "@/lib/syllabusMasterWriteGuards";
import { formatSupabaseError } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slotFromStartEnd } from "@/lib/dailyPlanTime";
import { USER_ERROR } from "@/lib/userFacingErrors";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase";

export type DailyTaskRow = Tables<"daily_tasks">;

/** Syllabus fields embedded on daily task reads (explicit shape; avoids Pick/Row drift). */
export type DailyTaskSyllabusEmbed = {
  id: string;
  subject: string;
  chapter: string;
  microtopic: string;
  /** Present when joined from `syllabus_master`; used to strip cross-exam links on read. */
  exam_name?: string | null;
};

export type DailyTaskView = DailyTaskRow & {
  plan_date: string;
  syllabus_master: DailyTaskSyllabusEmbed | null;
};

const REVAL_PATHS = [
  "/daily-plan",
  "/dictate-day",
  "/self-type-day",
  "/saved-plans",
  "/",
] as const;

function revalidateDailyPlanPaths(): void {
  for (const p of REVAL_PATHS) {
    revalidatePath(p);
  }
}

export async function ensureDailyPlanId(
  planDate: string,
): Promise<
  { ok: true; planId: string } | { ok: false; error: string }
> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(planDate)) {
    return { ok: false, error: "Invalid date." };
  }
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: USER_ERROR.session };

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("daily_plans")
      .upsert(
        {
          user_id: user.id,
          plan_date: planDate,
          updated_at: now,
        },
        { onConflict: "user_id,plan_date" },
      )
      .select("id")
      .single();

    if (error || !data?.id) {
      return { ok: false, error: USER_ERROR.tryAgain };
    }
    return { ok: true, planId: data.id };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function insertDailyTask(
  input: {
    plan_date: string;
    id: string;
    title: string;
    time_slot?: string | null;
    time_start?: string | null;
    time_end?: string | null;
    priority?: string;
    status?: string;
    source: "typed" | "voice" | "handwritten";
    source_raw_text?: string | null;
    syllabus_master_id?: string | null;
    /** Restored on undo; defaults to 0 for new tasks. */
    actual_worked_minutes?: number;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const planDate = input.plan_date?.trim() ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(planDate)) {
    return { ok: false, error: "Invalid date." };
  }
  const title = String(input.title ?? "").trim().slice(0, 500);
  if (!title) return { ok: false, error: "Title required." };

  const ensured = await ensureDailyPlanId(planDate);
  if (!ensured.ok) return ensured;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: USER_ERROR.session };

    const rawSid = input.syllabus_master_id?.trim() ?? "";
    let syllabus_master_id: string | null = null;
    if (rawSid) {
      const normalized = normalizeSyllabusMasterIdForDb(rawSid);
      if (!normalized) {
        return { ok: false, error: "Invalid syllabus link." };
      }
      try {
        await assertSyllabusBelongsToUserExam(supabase, user.id, [normalized]);
      } catch (e) {
        if (e instanceof SyllabusExamScopeError) {
          return { ok: false, error: "Invalid syllabus link." };
        }
        throw e;
      }
      syllabus_master_id = normalized;
    }
    const row: TablesInsert<"daily_tasks"> = {
      id: input.id,
      daily_plan_id: ensured.planId,
      title,
      time_slot: input.time_slot ?? null,
      time_start: input.time_start ?? null,
      time_end: input.time_end ?? null,
      priority: input.priority ?? "normal",
      status: input.status ?? "pending",
      source: input.source,
      source_raw_text: input.source_raw_text?.slice(0, 12000) ?? null,
      syllabus_master_id,
      actual_worked_minutes: input.actual_worked_minutes ?? 0,
    };

    const { error } = await supabase.from("daily_tasks").insert(row);
    if (error) {
      if (error.code === "23505") return { ok: true };
      return { ok: false, error: USER_ERROR.tryAgain };
    }
    revalidateDailyPlanPaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function updateDailyTask(
  id: string,
  patch: Pick<
    TablesUpdate<"daily_tasks">,
    | "title"
    | "time_slot"
    | "time_start"
    | "time_end"
    | "priority"
    | "status"
    | "source_raw_text"
    | "syllabus_master_id"
  >,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: USER_ERROR.session };

    const nextPatch: TablesUpdate<"daily_tasks"> = {
      ...patch,
      updated_at: new Date().toISOString(),
    };
    if ("syllabus_master_id" in patch) {
      const sid = patch.syllabus_master_id;
      if (sid === null || sid === "") {
        nextPatch.syllabus_master_id = null;
      } else {
        const normalized = normalizeSyllabusMasterIdForDb(String(sid));
        if (!normalized) {
          return { ok: false, error: "Invalid syllabus link." };
        }
        try {
          await assertSyllabusBelongsToUserExam(supabase, user.id, [normalized]);
        } catch (e) {
          if (e instanceof SyllabusExamScopeError) {
            return { ok: false, error: "Invalid syllabus link." };
          }
          throw e;
        }
        nextPatch.syllabus_master_id = normalized;
      }
    }

    const { error } = await supabase
      .from("daily_tasks")
      .update(nextPatch)
      .eq("id", id);

    if (error) return { ok: false, error: USER_ERROR.tryAgain };
    revalidateDailyPlanPaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

/**
 * Adds time from a Daily Plan timer stop (or multiple sessions) to `actual_worked_minutes`.
 * Idempotent from client side: call with the delta for each stopped session.
 */
export async function updateDailyTaskWorkedTime(
  id: string,
  additionalMinutes: number,
): Promise<
  { ok: true; totalMinutes: number } | { ok: false; error: string }
> {
  const add = Math.max(0, Math.round(Number(additionalMinutes)));
  if (!id) return { ok: false, error: "Invalid task." };

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: USER_ERROR.session };

    const { data: cur, error: selErr } = await supabase
      .from("daily_tasks")
      .select("actual_worked_minutes")
      .eq("id", id)
      .single();

    if (selErr || cur == null) {
      return { ok: false, error: USER_ERROR.tryAgain };
    }

    const prev = cur.actual_worked_minutes ?? 0;
    if (add === 0) {
      return { ok: true, totalMinutes: prev };
    }

    const total = prev + add;
    const { error } = await supabase
      .from("daily_tasks")
      .update({
        actual_worked_minutes: total,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return { ok: false, error: USER_ERROR.tryAgain };
    revalidateDailyPlanPaths();
    return { ok: true, totalMinutes: total };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function deleteDailyTask(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: USER_ERROR.session };

    const { error } = await supabase.from("daily_tasks").delete().eq("id", id);
    if (error) return { ok: false, error: USER_ERROR.tryAgain };
    revalidateDailyPlanPaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

/** Typed quick-add: start/end from `<input type="time">` values (HH:MM). */
export async function appendTypedDailyTaskQuick(input: {
  plan_date: string;
  title: string;
  start_input?: string;
  end_input?: string;
  source_raw_text?: string | null;
  syllabus_master_id?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const id = crypto.randomUUID();
  const { time_slot, time_start, time_end } = slotFromStartEnd(
    input.start_input ?? "",
    input.end_input ?? "",
  );
  const res = await insertDailyTask({
    plan_date: input.plan_date,
    id,
    title: input.title,
    time_slot,
    time_start,
    time_end,
    source: "typed",
    source_raw_text: input.source_raw_text ?? null,
    syllabus_master_id: input.syllabus_master_id ?? null,
  });
  if (!res.ok) return res;
  return { ok: true, id };
}
