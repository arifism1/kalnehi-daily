import { differenceInCalendarDays, parseISO } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";

function progressFromStatuses(
  rows: Array<{ status: string }> | null | undefined,
): { totalCount: number; doneCount: number; percent: number } {
  if (!rows?.length) return { totalCount: 0, doneCount: 0, percent: 0 };
  const totalCount = rows.length;
  const doneCount = rows.filter((r) => r.status === "done").length;
  const percent = Math.round((doneCount / totalCount) * 100);
  return { totalCount, doneCount, percent };
}

/**
 * Single-date unified daily plan progress. Returns null when there is no plan row
 * or the plan has zero `daily_tasks` (matches effectiveDayCompletion: fall back
 * to academic `tasks` in that case).
 */
export async function fetchDailyPlanProgressForDate(
  supabase: SupabaseClient<Database>,
  userId: string,
  planDate: string,
): Promise<{ totalCount: number; doneCount: number; percent: number } | null> {
  const { data: plan, error } = await supabase
    .from("daily_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("plan_date", planDate)
    .maybeSingle();
  if (error || !plan?.id) return null;

  const { data: taskRows, error: taskErr } = await supabase
    .from("daily_tasks")
    .select("status")
    .eq("daily_plan_id", plan.id);
  if (taskErr) return null;

  const p = progressFromStatuses(taskRows);
  if (p.totalCount === 0) return null;
  return p;
}

const IN_CHUNK = 120;

/**
 * `daily_tasks` on past days (plan_date < today) that are not done — unified
 * backlog, comparable to `findMissedIncompleteTasks` for academic tasks.
 */
export async function fetchIncompleteDailyTasksBeforeDate(
  supabase: SupabaseClient<Database>,
  userId: string,
  beforeDate: string,
): Promise<number> {
  const { data: plans, error } = await supabase
    .from("daily_plans")
    .select("id")
    .eq("user_id", userId)
    .lt("plan_date", beforeDate);
  if (error || !plans?.length) return 0;
  const ids = plans.flatMap((p) => (p.id ? [p.id] : []));
  if (ids.length === 0) return 0;

  let total = 0;
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const chunk = ids.slice(i, i + IN_CHUNK);
    // react-doctor-disable-next-line react-doctor/async-await-in-loop -- chunked queries are independent but must be sequential to accumulate totals
    const { count, error: cErr } = await supabase
      .from("daily_tasks")
      .select("id", { count: "exact", head: true })
      .in("daily_plan_id", chunk)
      .neq("status", "done");
    if (cErr) continue;
    total += count ?? 0;
  }
  return total;
}

/**
 * Mirrors {@link computeDaysBehindExecution} for unified daily plans: calendar
 * days from `calendarToday` to the reference "anchor" day (latest day with a
 * completed `daily_task`, else earliest day that had any plan tasks). null when
 * there is no unified-plan history to interpret.
 */
export async function fetchDailyPlanExecutionLagDays(
  supabase: SupabaseClient<Database>,
  userId: string,
  calendarToday: string,
): Promise<number | null> {
  const { data: plans, error } = await supabase
    .from("daily_plans")
    .select("plan_date, daily_tasks ( status )")
    .eq("user_id", userId)
    .lte("plan_date", calendarToday);
  if (error || !plans?.length) return null;

  let maxDoneDate: string | null = null;
  let minAnyDate: string | null = null;

  for (const p of plans) {
    const rows = p.daily_tasks;
    if (!Array.isArray(rows) || rows.length === 0) continue;
    if (minAnyDate == null || p.plan_date < minAnyDate) minAnyDate = p.plan_date;
    if (rows.some((r) => r.status === "done")) {
      if (maxDoneDate == null || p.plan_date > maxDoneDate) maxDoneDate = p.plan_date;
    }
  }

  if (minAnyDate == null) return null;
  const ref = maxDoneDate != null ? maxDoneDate : minAnyDate;
  return differenceInCalendarDays(parseISO(calendarToday), parseISO(ref));
}
