"use server";

import { revalidatePath } from "next/cache";

import { formatSupabaseError } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slotFromStartEnd } from "@/lib/dailyPlanTime";
import { USER_ERROR } from "@/lib/userFacingErrors";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase";

export type DailyTaskRow = Tables<"daily_tasks">;

export type DailyTaskView = DailyTaskRow & { plan_date: string };

const REVAL_PATHS = [
  "/daily-plan",
  "/dictate-day",
  "/self-type-day",
  "/paste-handwritten",
  "/plan-my-day",
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

export async function listDailyPlanTasksForDate(
  planDate: string,
  opts?: { source?: "typed" | "voice" | "handwritten" },
): Promise<
  | { ok: true; planId: string | null; tasks: DailyTaskView[] }
  | { ok: false; error: string; planId: null; tasks: [] }
> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(planDate)) {
    return { ok: false, error: "Invalid date.", planId: null, tasks: [] };
  }
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, error: USER_ERROR.session, planId: null, tasks: [] };
    }

    const { data: plan, error: planErr } = await supabase
      .from("daily_plans")
      .select("id")
      .eq("user_id", user.id)
      .eq("plan_date", planDate)
      .maybeSingle();

    if (planErr) throw planErr;
    if (!plan?.id) {
      return { ok: true, planId: null, tasks: [] };
    }

    let q = supabase
      .from("daily_tasks")
      .select("*")
      .eq("daily_plan_id", plan.id)
      .order("created_at", { ascending: true });

    if (opts?.source) {
      q = q.eq("source", opts.source);
    }

    const { data: rows, error } = await q;
    if (error) throw error;

    const tasks: DailyTaskView[] = (rows ?? []).map((r) => ({
      ...(r as DailyTaskRow),
      plan_date: planDate,
    }));

    return { ok: true, planId: plan.id, tasks };
  } catch (e) {
    return {
      ok: false,
      error: formatSupabaseError(e),
      planId: null,
      tasks: [],
    };
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
  >,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: USER_ERROR.session };

    const { error } = await supabase
      .from("daily_tasks")
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return { ok: false, error: USER_ERROR.tryAgain };
    revalidateDailyPlanPaths();
    return { ok: true };
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
  });
  if (!res.ok) return res;
  return { ok: true, id };
}
