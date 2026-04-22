import type {
  DailyTaskRow,
  DailyTaskSyllabusEmbed,
  DailyTaskView,
} from "@/actions/dailyPlan";
import {
  getUserCatalogExamContext,
  resolveAllowedSyllabusMasterIdsForUser,
} from "@/lib/syllabusMasterWriteGuards";
import { normalizeSyllabusMasterId } from "@/lib/syllabusIds";
import { formatSupabaseError, getSupabaseBrowserClient } from "@/lib/supabase";
import { USER_ERROR } from "@/lib/userFacingErrors";

export type FetchDailyPlanTasksResult =
  | { ok: true; planId: string | null; tasks: DailyTaskView[] }
  | { ok: false; error: string; planId: null; tasks: [] };

/** PostgREST nested select: explicit columns (omit heavy `source_raw_text` on list load). */
const DAILY_PLANS_WITH_TASKS_SELECT = `
  id,
  daily_tasks (
    id,
    daily_plan_id,
    title,
    time_slot,
    time_start,
    time_end,
    priority,
    status,
    source,
    syllabus_master_id,
    actual_worked_minutes,
    created_at,
    updated_at,
    syllabus_master ( id, subject, chapter, microtopic, exam_name )
  )
`.trim();

type EmbeddedDailyTaskRow = Omit<DailyTaskRow, "source_raw_text"> & {
  syllabus_master: DailyTaskSyllabusEmbed | DailyTaskSyllabusEmbed[] | null;
};

type PlanRow = {
  id: string;
  daily_tasks: EmbeddedDailyTaskRow[] | null;
};

type CacheEntry = {
  planId: string | null;
  tasks: DailyTaskView[];
  fetchedAt: number;
};

const planTasksCache = new Map<string, CacheEntry>();

export function clearDailyPlanTasksCache(): void {
  planTasksCache.clear();
}

export function peekDailyPlanTasksCache(planDate: string): CacheEntry | null {
  return planTasksCache.get(planDate) ?? null;
}

export function putDailyPlanTasksCache(
  planDate: string,
  planId: string | null,
  tasks: DailyTaskView[],
): void {
  planTasksCache.set(planDate, {
    planId,
    tasks,
    fetchedAt: Date.now(),
  });
}

function normalizeSyllabusEmbed(
  emb: DailyTaskSyllabusEmbed | DailyTaskSyllabusEmbed[] | null,
): DailyTaskSyllabusEmbed | null {
  if (emb == null) return null;
  return Array.isArray(emb) ? (emb[0] ?? null) : emb;
}

function rowToView(row: EmbeddedDailyTaskRow, planDate: string): DailyTaskView {
  const syllabus_master = normalizeSyllabusEmbed(row.syllabus_master);
  const { syllabus_master: _drop, ...rest } = row;
  return {
    ...(rest as Omit<DailyTaskRow, "source_raw_text">),
    source_raw_text: null,
    syllabus_master,
    plan_date: planDate,
  };
}

/** Strips daily-plan syllabus links that are not part of the signed-in user's catalog exam. */
function sanitizeTasksForUserExamScope(
  tasks: DailyTaskView[],
  examKey: string | null,
  allowedCustomOrCatalogIds: ReadonlySet<string>,
): DailyTaskView[] {
  return tasks.map((t) => {
    const rawSid = t.syllabus_master_id?.trim() ?? "";
    if (!rawSid) return t;
    const sid = normalizeSyllabusMasterId(rawSid);
    const emb = t.syllabus_master;

    if (!examKey) {
      return { ...t, syllabus_master_id: null, syllabus_master: null };
    }

    if (emb?.exam_name != null && emb.exam_name !== examKey) {
      return { ...t, syllabus_master_id: null, syllabus_master: null };
    }

    if (emb?.exam_name === examKey) {
      return t;
    }

    if (!allowedCustomOrCatalogIds.has(sid)) {
      return { ...t, syllabus_master_id: null, syllabus_master: null };
    }
    return t;
  });
}

/**
 * Loads one day's tasks via browser Supabase (RLS): one round-trip, no Server Action.
 * Omits `source_raw_text` from the payload; use `fetchDailyTaskSourceRawTextForUndo` before delete if needed.
 */
export async function fetchDailyPlanTasksForClient(
  planDate: string,
): Promise<FetchDailyPlanTasksResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(planDate)) {
    return { ok: false, error: "Invalid date.", planId: null, tasks: [] };
  }
  try {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, error: USER_ERROR.session, planId: null, tasks: [] };
    }

    const { data, error } = await supabase
      .from("daily_plans")
      .select(DAILY_PLANS_WITH_TASKS_SELECT)
      .eq("user_id", user.id)
      .eq("plan_date", planDate)
      .order("created_at", { ascending: true, foreignTable: "daily_tasks" })
      .maybeSingle();

    if (error) throw error;

    const plan = data as PlanRow | null;
    if (!plan?.id) {
      return { ok: true, planId: null, tasks: [] };
    }

    const rawTasks = plan.daily_tasks ?? [];
    const tasksDraft: DailyTaskView[] = rawTasks.map((r) => rowToView(r, planDate));

    const examCtx = await getUserCatalogExamContext(supabase, user.id);
    const examKey = examCtx?.examKey ?? null;

    const needsMembershipCheck: string[] = [];
    for (const t of tasksDraft) {
      const rawSid = t.syllabus_master_id?.trim() ?? "";
      if (!rawSid) continue;
      const emb = t.syllabus_master;
      if (examKey && emb?.exam_name === examKey) continue;
      if (examKey && emb?.exam_name != null && emb.exam_name !== examKey) continue;
      needsMembershipCheck.push(normalizeSyllabusMasterId(rawSid));
    }

    const allowed = await resolveAllowedSyllabusMasterIdsForUser(
      supabase,
      user.id,
      needsMembershipCheck,
    );

    const tasks = sanitizeTasksForUserExamScope(tasksDraft, examKey, allowed);

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

/** One-column read while row still exists; use before delete for undo fidelity. */
export async function fetchDailyTaskSourceRawTextForUndo(
  taskId: string,
): Promise<string | null> {
  try {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("daily_tasks")
      .select("source_raw_text")
      .eq("id", taskId)
      .maybeSingle();
    if (error) return null;
    return data?.source_raw_text ?? null;
  } catch {
    return null;
  }
}
