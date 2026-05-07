"use server";

import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { revalidatePath } from "next/cache";

import {
  insertDailyTask,
  moveDailyTaskToPlanDate,
  updateDailyTask,
} from "@/actions/dailyPlan";
import {
  computeBacklogSchedule,
  type BacklogScheduleIntensity,
  type SchedulableBacklogItem,
} from "@/lib/backlogRecoveryScheduling";
import { assertSyllabusBelongsToUserExam } from "@/lib/syllabusMasterWriteGuards";
import { formatSupabaseError } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { USER_ERROR } from "@/lib/userFacingErrors";
import type { TablesInsert } from "@/types/supabase";

export type OrganizedBacklogItemInput = {
  title: string;
  syllabus_master_id?: string | null;
  group_label?: string | null;
  difficulty?: string | null;
  /** User-owned minutes only (never from AI). */
  effort_estimate_minutes?: number | null;
  details?: string | null;
  existing_backlog_id?: string | null;
  retry_count?: number;
  last_attempt_date?: string | null;
};

const REVAL_PATHS = [
  "/backlog-list",
  "/backlog-tracker",
  "/daily-plan",
  "/",
] as const;

function revalidateBacklogPaths(): void {
  for (const p of REVAL_PATHS) {
    revalidatePath(p);
  }
}

async function loadTodayPlanTaskStats(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  todayYmd: string,
): Promise<{ usedMinutesToday: number; backlogTaskCountToday: number }> {
  const { data: plan } = await supabase
    .from("daily_plans")
    .select(
      `
      id,
      daily_tasks (
        estimated_minutes,
        status,
        backlog_item_id
      )
    `,
    )
    .eq("user_id", userId)
    .eq("plan_date", todayYmd)
    .maybeSingle();

  let usedMinutesToday = 0;
  let backlogTaskCountToday = 0;
  const rawTasks = (plan as { daily_tasks?: unknown } | null)?.daily_tasks;
  const list = Array.isArray(rawTasks) ? rawTasks : rawTasks ? [rawTasks] : [];
  for (const t of list as {
      estimated_minutes: number | null;
      status: string;
      backlog_item_id: string | null;
  }[]) {
    if (!t || t.status === "done" || t.status === "skipped") continue;
    usedMinutesToday += Math.max(0, t.estimated_minutes ?? 0);
    if (t.backlog_item_id) backlogTaskCountToday += 1;
  }
  return { usedMinutesToday, backlogTaskCountToday };
}

function toSchedulableItems(items: OrganizedBacklogItemInput[]): SchedulableBacklogItem[] {
  return items.map((it) => ({
    title: String(it.title ?? "").trim().slice(0, 500),
    details: String(it.details ?? "").trim().slice(0, 8000),
    syllabus_master_id: it.syllabus_master_id?.trim() || null,
    group_label: it.group_label?.trim()?.slice(0, 120) || null,
    difficulty: it.difficulty?.trim()?.slice(0, 32) || null,
    effort_estimate_minutes:
      typeof it.effort_estimate_minutes === "number" && Number.isFinite(it.effort_estimate_minutes)
        ? Math.max(15, Math.min(480, Math.round(it.effort_estimate_minutes)))
        : 0,
    existing_backlog_id: it.existing_backlog_id?.trim() || null,
    retry_count: it.retry_count ?? 0,
    last_attempt_date: it.last_attempt_date?.trim() || null,
  }));
}

/** Replace all `pending` backlog rows from organize (Backlog List unplanned). */
export async function commitPendingBacklogFromOrganize(
  items: OrganizedBacklogItemInput[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "Nothing to save." };
  }
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: USER_ERROR.session };

    const { error: delErr } = await supabase
      .from("user_syllabus_backlog")
      .delete()
      .eq("user_id", user.id)
      .eq("status", "pending");
    if (delErr) return { ok: false, error: USER_ERROR.tryAgain };

    const rows: TablesInsert<"user_syllabus_backlog">[] = items.flatMap((it) => {
      const title = String(it.title ?? "").trim().slice(0, 500);
      if (!title) return [];
      const mins =
        typeof it.effort_estimate_minutes === "number" && Number.isFinite(it.effort_estimate_minutes)
          ? Math.max(5, Math.min(480, Math.round(it.effort_estimate_minutes)))
          : null;
      return [
        {
          user_id: user.id,
          title,
          details: String(it.details ?? "").trim().slice(0, 8000),
          syllabus_master_id: it.syllabus_master_id?.trim() || null,
          group_label: it.group_label?.trim()?.slice(0, 120) || null,
          difficulty: it.difficulty?.trim()?.slice(0, 32) || null,
          effort_estimate_minutes: mins,
          status: "pending",
        } satisfies TablesInsert<"user_syllabus_backlog">,
      ];
    });

    if (rows.length === 0) return { ok: false, error: "Nothing to save." };

    for (const r of rows) {
      if (r.syllabus_master_id) {
        try {
          await assertSyllabusBelongsToUserExam(supabase, user.id, [
            r.syllabus_master_id,
          ]);
        } catch {
          r.syllabus_master_id = null;
        }
      }
    }

    const { error: insErr } = await supabase.from("user_syllabus_backlog").insert(rows);
    if (insErr) return { ok: false, error: USER_ERROR.tryAgain };
    revalidateBacklogPaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

/** Append pending backlog rows (Backlog List unplanned) without deleting existing pending items. */
export async function appendPendingBacklogItems(
  items: OrganizedBacklogItemInput[],
): Promise<{ ok: true; ids: string[] } | { ok: false; error: string }> {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, error: "Nothing to save." };
  }
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: USER_ERROR.session };

    const rows: TablesInsert<"user_syllabus_backlog">[] = [];
    const ids: string[] = [];

    for (const it of items) {
      const title = String(it.title ?? "").trim().slice(0, 500);
      if (!title) continue;
      const id = crypto.randomUUID();
      ids.push(id);
      const mins =
        typeof it.effort_estimate_minutes === "number" && Number.isFinite(it.effort_estimate_minutes)
          ? Math.max(5, Math.min(480, Math.round(it.effort_estimate_minutes)))
          : null;
      rows.push({
        id,
        user_id: user.id,
        title,
        details: String(it.details ?? "").trim().slice(0, 8000),
        syllabus_master_id: it.syllabus_master_id?.trim() || null,
        group_label: it.group_label?.trim()?.slice(0, 120) || null,
        difficulty: it.difficulty?.trim()?.slice(0, 32) || null,
        effort_estimate_minutes: mins,
        status: "pending",
      } satisfies TablesInsert<"user_syllabus_backlog">);
    }

    if (rows.length === 0) return { ok: false, error: "Nothing to save." };

    for (const r of rows) {
      if (r.syllabus_master_id) {
        try {
          await assertSyllabusBelongsToUserExam(supabase, user.id, [
            r.syllabus_master_id,
          ]);
        } catch {
          r.syllabus_master_id = null;
        }
      }
    }

    const { error: insErr } = await supabase.from("user_syllabus_backlog").insert(rows);
    if (insErr) return { ok: false, error: USER_ERROR.tryAgain };
    revalidateBacklogPaths();
    return { ok: true, ids };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function deletePendingBacklogRow(
  backlogId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = String(backlogId ?? "").trim();
  if (!id) return { ok: false, error: "Invalid item." };
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: USER_ERROR.session };

    const { error } = await supabase
      .from("user_syllabus_backlog")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("status", "pending");
    if (error) return { ok: false, error: USER_ERROR.tryAgain };
    revalidateBacklogPaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function updatePendingBacklogRowSubject(
  backlogId: string,
  group_label: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = String(backlogId ?? "").trim();
  if (!id) return { ok: false, error: "Invalid item." };
  const raw = group_label == null ? "" : String(group_label);
  const label = raw.trim().slice(0, 120) || null;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: USER_ERROR.session };

    const { error } = await supabase
      .from("user_syllabus_backlog")
      .update({
        group_label: label,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("status", "pending");
    if (error) return { ok: false, error: USER_ERROR.tryAgain };
    revalidateBacklogPaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function previewBacklogSchedule(
  items: OrganizedBacklogItemInput[],
  todayYmd: string,
  userLocalHour: number,
  intensity: BacklogScheduleIntensity,
  scheduleStartYmd?: string | null,
): Promise<
  | {
      ok: true;
      startsToday: boolean;
      headline: string;
      startYmd: string;
      rows: {
        plan_date: string;
        title: string;
        estimated_minutes: number;
        group_label: string | null;
      }[];
      perDay: number;
    }
  | { ok: false; error: string }
> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(todayYmd.trim())) {
    return { ok: false, error: "Invalid date." };
  }
  const schedulable = toSchedulableItems(items).filter((s) => s.title.length > 0);
  if (schedulable.length === 0) {
    return { ok: false, error: "Nothing to schedule." };
  }
  if (schedulable.some((s) => s.effort_estimate_minutes < 15)) {
    return { ok: false, error: "Set time for each task (15+ min)." };
  }

  const startPick = typeof scheduleStartYmd === "string" ? scheduleStartYmd.trim() : "";
  if (startPick) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startPick)) {
      return { ok: false, error: "Invalid start date." };
    }
    if (startPick < todayYmd.trim()) {
      return { ok: false, error: "Start date can’t be in the past." };
    }
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: USER_ERROR.session };

    const { usedMinutesToday, backlogTaskCountToday } = await loadTodayPlanTaskStats(
      supabase,
      user.id,
      todayYmd.trim(),
    );

    const result = computeBacklogSchedule({
      todayYmd: todayYmd.trim(),
      userLocalHour: Math.max(0, Math.min(23, Math.floor(userLocalHour))),
      items: schedulable,
      intensity,
      usedMinutesToday,
      backlogTaskCountToday,
      scheduleStartYmd: startPick || null,
    });

    return {
      ok: true,
      startsToday: result.startsToday,
      headline: result.headline,
      startYmd: result.startYmd,
      rows: result.rows,
      perDay: result.perDay,
    };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

/**
 * Commit recovery plan: optional vent audit row, cleans extra pending rows, creates / updates backlog + daily_tasks.
 */
export async function commitBacklogSchedule(
  items: OrganizedBacklogItemInput[],
  todayYmd: string,
  userLocalHour: number,
  intensity: BacklogScheduleIntensity,
  options?: { ventRawText?: string | null; scheduleStartYmd?: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(todayYmd.trim())) {
    return { ok: false, error: "Invalid date." };
  }
  const schedulable = toSchedulableItems(items).filter((s) => s.title.length > 0);
  if (schedulable.length === 0) {
    return { ok: false, error: "Nothing to schedule." };
  }
  if (schedulable.some((s) => s.effort_estimate_minutes < 15)) {
    return { ok: false, error: "Set time for each task (15+ min)." };
  }

  const startPick =
    typeof options?.scheduleStartYmd === "string" ? options.scheduleStartYmd.trim() : "";
  if (startPick) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startPick)) {
      return { ok: false, error: "Invalid start date." };
    }
    if (startPick < todayYmd.trim()) {
      return { ok: false, error: "Start date can’t be in the past." };
    }
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: USER_ERROR.session };

    const vent = String(options?.ventRawText ?? "").trim().slice(0, 24_000);
    if (vent.length > 0) {
      const { error: vErr } = await supabase.from("user_backlog_vents").insert({
        user_id: user.id,
        raw_text: vent,
      });
      if (vErr) console.warn("[commitBacklogSchedule] vent insert", vErr.message);
    }

    const { usedMinutesToday, backlogTaskCountToday } = await loadTodayPlanTaskStats(
      supabase,
      user.id,
      todayYmd.trim(),
    );

    const computed = computeBacklogSchedule({
      todayYmd: todayYmd.trim(),
      userLocalHour: Math.max(0, Math.min(23, Math.floor(userLocalHour))),
      items: schedulable,
      intensity,
      usedMinutesToday,
      backlogTaskCountToday,
      scheduleStartYmd: startPick || null,
    });

    const existingIds = schedulable
      .map((s) => s.existing_backlog_id)
      .filter((x): x is string => typeof x === "string" && x.length > 0);

    const { data: pendingAll } = await supabase
      .from("user_syllabus_backlog")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "pending");

    const toDeletePending = (pendingAll ?? [])
      .map((r) => r.id)
      .filter((id) => !existingIds.includes(id));
    if (toDeletePending.length > 0) {
      const { error: d0 } = await supabase
        .from("user_syllabus_backlog")
        .delete()
        .in("id", toDeletePending);
      if (d0) return { ok: false, error: USER_ERROR.tryAgain };
    }

    for (const { item, plan_date } of computed.assignments) {
      let sid = item.syllabus_master_id;
      if (sid) {
        try {
          await assertSyllabusBelongsToUserExam(supabase, user.id, [sid]);
        } catch {
          sid = null;
        }
      }

      const minutes = item.effort_estimate_minutes;
      let backlogId: string;

      if (item.existing_backlog_id) {
        backlogId = item.existing_backlog_id;
        const { error: dT } = await supabase
          .from("daily_tasks")
          .delete()
          .eq("backlog_item_id", backlogId)
          .neq("status", "done");
        if (dT) return { ok: false, error: USER_ERROR.tryAgain };

        const { error: uB } = await supabase
          .from("user_syllabus_backlog")
          .update({
            title: item.title,
            details: item.details,
            syllabus_master_id: sid,
            group_label: item.group_label,
            difficulty: item.difficulty,
            effort_estimate_minutes: minutes,
            status: "pending",
            updated_at: new Date().toISOString(),
          })
          .eq("id", backlogId)
          .eq("user_id", user.id);
        if (uB) return { ok: false, error: USER_ERROR.tryAgain };
      } else {
        backlogId = crypto.randomUUID();
        const { error: bErr } = await supabase.from("user_syllabus_backlog").insert({
          id: backlogId,
          user_id: user.id,
          title: item.title,
          details: item.details,
          syllabus_master_id: sid,
          group_label: item.group_label,
          difficulty: item.difficulty,
          effort_estimate_minutes: minutes,
          status: "pending",
        });
        if (bErr) return { ok: false, error: USER_ERROR.tryAgain };
      }

      const taskId = crypto.randomUUID();
      const ins = await insertDailyTask({
        plan_date: plan_date,
        id: taskId,
        title: item.title,
        source: "backlog",
        priority: "high",
        status: "pending",
        syllabus_master_id: sid,
        source_raw_text: `backlog:${backlogId}`,
        estimated_minutes: minutes,
        backlog_item_id: backlogId,
      });
      if (!ins.ok) {
        await supabase.from("user_syllabus_backlog").delete().eq("id", backlogId);
        return ins;
      }

      const { error: uErr } = await supabase
        .from("user_syllabus_backlog")
        .update({ status: "scheduled", updated_at: new Date().toISOString() })
        .eq("id", backlogId);
      if (uErr) return { ok: false, error: USER_ERROR.tryAgain };
    }

    revalidateBacklogPaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

/** @deprecated Use commitBacklogSchedule with client today + local hour + intensity. */
export async function lockOrganizedBacklogToPlan(
  items: OrganizedBacklogItemInput[],
  startPlanDate: string,
  options?: { perDay?: number },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const intensity: BacklogScheduleIntensity =
    (options?.perDay ?? 3) <= 2 ? "lighter" : "heavier";
  const d = new Date();
  const todayYmd = format(d, "yyyy-MM-dd");
  return commitBacklogSchedule(items, todayYmd, d.getHours(), intensity);
}

/**
 * Return incomplete backlog-linked daily tasks from past plan days to pending backlog.
 * Idempotent per task id.
 */
export async function rolloverMissedBacklogRecoveryTasks(
  todayYmd: string,
): Promise<{ ok: true; rolled: number } | { ok: false; error: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(todayYmd.trim())) {
    return { ok: false, error: "Invalid date." };
  }
  const today = todayYmd.trim();
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: USER_ERROR.session };

    const { data: pastPlans, error: planErr } = await supabase
      .from("daily_plans")
      .select("id")
      .eq("user_id", user.id)
      .lt("plan_date", today);

    if (planErr) {
      console.error("[rolloverMissedBacklogRecoveryTasks] plans", planErr);
      return { ok: false, error: USER_ERROR.tryAgain };
    }

    const planIds = (pastPlans ?? []).map((p) => p.id).filter(Boolean);
    if (planIds.length === 0) {
      return { ok: true, rolled: 0 };
    }

    const { data: rows, error: qErr } = await supabase
      .from("daily_tasks")
      .select("id, status, backlog_item_id")
      .in("daily_plan_id", planIds)
      .not("backlog_item_id", "is", null);

    if (qErr) {
      console.error("[rolloverMissedBacklogRecoveryTasks]", qErr);
      return { ok: false, error: USER_ERROR.tryAgain };
    }

    let rolled = 0;
    const list = rows ?? [];
    for (const t of list) {
      if (t.status === "done" || !t.backlog_item_id) continue;

      const { error: delErr } = await supabase.from("daily_tasks").delete().eq("id", t.id);
      if (delErr) continue;

      const { data: prev } = await supabase
        .from("user_syllabus_backlog")
        .select("retry_count")
        .eq("id", t.backlog_item_id)
        .eq("user_id", user.id)
        .maybeSingle();

      const nextRetry = (prev?.retry_count ?? 0) + 1;

      await supabase
        .from("user_syllabus_backlog")
        .update({
          status: "pending",
          last_attempt_date: today,
          retry_count: nextRetry,
          updated_at: new Date().toISOString(),
        })
        .eq("id", t.backlog_item_id)
        .eq("user_id", user.id);
      rolled += 1;
    }

    if (rolled > 0) revalidateBacklogPaths();
    return { ok: true, rolled };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export type TaskListBacklogRow = {
  id: string;
  title: string;
  status: string;
  effort_estimate_minutes: number | null;
  group_label: string | null;
  last_attempt_date: string | null;
  retry_count: number;
};

export type TaskListPlannedRow = {
  plan_date: string;
  task_id: string;
  title: string;
  estimated_minutes: number | null;
  backlog_item_id: string | null;
  /** Subject / grouping from linked backlog row */
  group_label: string | null;
};

const PLAN_FETCH_MAX_SPAN_DAYS = 400;

export type FetchTaskListPayloadOptions = {
  plannedFromYmd?: string | null;
  plannedToYmd?: string | null;
};

/**
 * Edit a backlog-linked planned daily task (title, duration, calendar day).
 * Syncs matching fields on `user_syllabus_backlog`.
 */
export async function updateRecoveryPlannedTask(input: {
  daily_task_id: string;
  title?: string;
  estimated_minutes?: number | null;
  target_plan_date?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const taskId = input.daily_task_id?.trim() ?? "";
  if (!taskId) return { ok: false, error: "Invalid task." };

  const targetRaw = input.target_plan_date?.trim() ?? "";
  const targetYmd =
    targetRaw && /^\d{4}-\d{2}-\d{2}$/.test(targetRaw) ? targetRaw : null;
  if (targetRaw && !targetYmd) {
    return { ok: false, error: "Invalid date." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: USER_ERROR.session };

    const { data: taskRow, error: taskErr } = await supabase
      .from("daily_tasks")
      .select("id, backlog_item_id, daily_plan_id")
      .eq("id", taskId)
      .maybeSingle();

    if (taskErr || !taskRow) return { ok: false, error: USER_ERROR.tryAgain };

    const { data: planRow, error: planErr } = await supabase
      .from("daily_plans")
      .select("user_id, plan_date")
      .eq("id", taskRow.daily_plan_id)
      .maybeSingle();

    if (planErr || !planRow || planRow.user_id !== user.id) {
      return { ok: false, error: USER_ERROR.tryAgain };
    }

    const backlogItemId = taskRow.backlog_item_id?.trim();
    if (!backlogItemId) {
      return {
        ok: false,
        error: "This planned row is not linked to backlog.",
      };
    }

    const patch: Parameters<typeof updateDailyTask>[1] = {};

    if (input.title !== undefined) {
      const t = input.title.trim();
      if (!t) return { ok: false, error: "Title cannot be empty." };
      patch.title = t;
    }

    if (input.estimated_minutes !== undefined) {
      if (
        input.estimated_minutes !== null &&
        !Number.isFinite(Number(input.estimated_minutes))
      ) {
        return { ok: false, error: "Invalid duration." };
      }
      patch.estimated_minutes =
        input.estimated_minutes == null
          ? null
          : Math.max(0, Math.round(Number(input.estimated_minutes)));
    }

    if (Object.keys(patch).length > 0) {
      const u = await updateDailyTask(taskId, patch);
      if (!u.ok) return u;
    }

    const backlogUpdates: {
      title?: string;
      effort_estimate_minutes?: number | null;
      updated_at?: string;
    } = {};
    if (input.title !== undefined) {
      backlogUpdates.title = input.title.trim();
      if (!backlogUpdates.title) {
        return { ok: false, error: "Title cannot be empty." };
      }
    }
    if (input.estimated_minutes !== undefined) {
      backlogUpdates.effort_estimate_minutes =
        input.estimated_minutes == null
          ? null
          : Math.max(0, Math.round(Number(input.estimated_minutes)));
    }

    if (Object.keys(backlogUpdates).length > 0) {
      backlogUpdates.updated_at = new Date().toISOString();
      const { error: bErr } = await supabase
        .from("user_syllabus_backlog")
        .update(backlogUpdates)
        .eq("id", backlogItemId)
        .eq("user_id", user.id);
      if (bErr) return { ok: false, error: USER_ERROR.tryAgain };
    }

    const currentYmd =
      typeof planRow.plan_date === "string"
        ? planRow.plan_date.slice(0, 10)
        : "";
    if (targetYmd && targetYmd !== currentYmd) {
      const m = await moveDailyTaskToPlanDate(taskId, targetYmd);
      if (!m.ok) return m;
    }

    revalidateBacklogPaths();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function fetchTaskListPayload(
  options?: FetchTaskListPayloadOptions,
): Promise<
  | {
      ok: true;
      unplanned: TaskListBacklogRow[];
      unplannedTotal: number;
      plannedByDate: Record<string, TaskListPlannedRow[]>;
      todayYmd: string;
      plannedWindow: { fromYmd: string; toYmd: string };
    }
  | { ok: false; error: string }
> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: USER_ERROR.session };

    const todayYmd = format(new Date(), "yyyy-MM-dd");

    const { data: pendingRows, count } = await supabase
      .from("user_syllabus_backlog")
      .select(
        "id, title, status, effort_estimate_minutes, group_label, last_attempt_date, retry_count, created_at",
        {
          count: "exact",
        },
      )
      .eq("user_id", user.id)
      .eq("status", "pending")
      .limit(40);

    const sortedPending = [...(pendingRows ?? [])].sort((a, b) => {
      const rc = (b.retry_count ?? 0) - (a.retry_count ?? 0);
      if (rc !== 0) return rc;
      const ad = a.last_attempt_date ?? "";
      const bd = b.last_attempt_date ?? "";
      if (ad !== bd) return bd.localeCompare(ad);
      return String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""));
    });

    const defaultFrom = format(addDays(new Date(), -1), "yyyy-MM-dd");
    const defaultTo = format(addDays(new Date(), 30), "yyyy-MM-dd");
    let fromYmd = defaultFrom;
    let toYmd = defaultTo;
    const rf = options?.plannedFromYmd?.trim();
    const rt = options?.plannedToYmd?.trim();
    if (rf && /^\d{4}-\d{2}-\d{2}$/.test(rf)) fromYmd = rf;
    if (rt && /^\d{4}-\d{2}-\d{2}$/.test(rt)) toYmd = rt;
    if (fromYmd > toYmd) {
      const swap = fromYmd;
      fromYmd = toYmd;
      toYmd = swap;
    }
    const span = differenceInCalendarDays(
      parseISO(`${toYmd}T12:00:00`),
      parseISO(`${fromYmd}T12:00:00`),
    );
    if (span > PLAN_FETCH_MAX_SPAN_DAYS) {
      toYmd = format(
        addDays(parseISO(`${fromYmd}T12:00:00`), PLAN_FETCH_MAX_SPAN_DAYS),
        "yyyy-MM-dd",
      );
    }

    const { data: plans, error: pErr } = await supabase
      .from("daily_plans")
      .select(
        `
        plan_date,
        daily_tasks (
          id,
          title,
          estimated_minutes,
          backlog_item_id,
          status,
          user_syllabus_backlog (
            group_label
          )
        )
      `,
      )
      .eq("user_id", user.id)
      .gte("plan_date", fromYmd)
      .lte("plan_date", toYmd)
      .order("plan_date", { ascending: true });

    if (pErr) {
      console.error("[fetchTaskListPayload] plans", pErr);
    }

    const unplannedTotal = count ?? sortedPending.length;
    const unplanned: TaskListBacklogRow[] = sortedPending.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      effort_estimate_minutes: r.effort_estimate_minutes,
      group_label: r.group_label,
      last_attempt_date: r.last_attempt_date ?? null,
      retry_count: r.retry_count ?? 0,
    }));

    const plannedByDate: Record<string, TaskListPlannedRow[]> = {};
    for (const p of plans ?? []) {
      const row = p as {
        plan_date: string;
        daily_tasks: unknown;
      };
      const ymd =
        typeof row.plan_date === "string" ? row.plan_date.slice(0, 10) : "";
      if (!ymd) continue;
      const rawTasks = row.daily_tasks;
      const tasks = Array.isArray(rawTasks) ? rawTasks : rawTasks ? [rawTasks] : [];
      for (const t of tasks as {
        id: string;
        title: string;
        estimated_minutes: number | null;
        backlog_item_id: string | null;
        status: string;
        user_syllabus_backlog?: { group_label: string | null } | null;
      }[]) {
        if (!t?.backlog_item_id || t.status === "skipped") continue;
        const emb = t.user_syllabus_backlog;
        const group_label =
          emb == null
            ? null
            : Array.isArray(emb)
              ? (emb[0]?.group_label ?? null)
              : (emb.group_label ?? null);
        const list = plannedByDate[ymd] ?? [];
        list.push({
          plan_date: ymd,
          task_id: t.id,
          title: t.title,
          estimated_minutes: t.estimated_minutes,
          backlog_item_id: t.backlog_item_id,
          group_label,
        });
        plannedByDate[ymd] = list;
      }
    }

    return {
      ok: true,
      unplanned,
      unplannedTotal,
      plannedByDate,
      todayYmd,
      plannedWindow: { fromYmd, toYmd },
    };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}

export async function fetchBacklogRecoverySummaryForHome(): Promise<
  | { ok: true; pendingCount: number; scheduledActiveCount: number }
  | { ok: false; error: string }
> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: USER_ERROR.session };

    const [{ count: pendingCount }, { count: scheduledCount }] = await Promise.all([
      supabase
        .from("user_syllabus_backlog")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "pending"),
      supabase
        .from("user_syllabus_backlog")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "scheduled"),
    ]);

    return {
      ok: true,
      pendingCount: pendingCount ?? 0,
      scheduledActiveCount: scheduledCount ?? 0,
    };
  } catch (e) {
    return { ok: false, error: formatSupabaseError(e) };
  }
}
