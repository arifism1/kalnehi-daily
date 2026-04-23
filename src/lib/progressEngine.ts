import { differenceInCalendarDays, parseISO } from "date-fns";

import { toCalendarDateKey } from "@/lib/calendarDateKey";
import type { Microtopic, Task } from "@/store/useTaskStore";

export const PROGRESS_THRESHOLDS = {
  PERFECT_MIN_PERCENT: 95,
  PARTIAL_MIN_PERCENT: 50,
} as const;

export type ProgressMessage = "perfect" | "partial" | "falling_behind";

export const PROGRESS_MESSAGE_LABEL: Record<ProgressMessage, string> = {
  perfect: "Execution locked in",
  partial: "Ground left untaken",
  falling_behind: "Rank at risk",
};

/** Weighted marks secured vs total weight for a task list (uses marks_weight / marks_value / syllabus). */
export function computeWeightedMarksTotals(
  tasks: Task[],
  microtopicById: Record<string, Microtopic>,
): { mastered: number; total: number } {
  let total = 0;
  let mastered = 0;
  for (const t of tasks) {
    const w = resolveTaskMarksWeight(t, microtopicById);
    total += w;
    if (isTaskCompleted(t)) mastered += w;
  }
  return { mastered, total };
}

export function isTaskCompleted(task: Task): boolean {
  return task.status === "completed";
}

export function resolveTaskMarksWeight(
  task: Task,
  microtopicById: Record<string, Microtopic>,
): number {
  if (task.marks_value != null && task.marks_value > 0) {
    return task.marks_value;
  }
  if (task.marks_weight != null && task.marks_weight > 0) {
    return task.marks_weight;
  }
  if (!task.microtopic_id) return 1;
  const m = microtopicById[task.microtopic_id];
  if (!m) return 1;
  const w = m.marks_2025 ?? m.marks_2024 ?? m.marks_2023 ?? null;
  return w != null && w > 0 ? w : 1;
}

export function computeWeightedCompletionPercent(
  tasks: Task[],
  microtopicById: Record<string, Microtopic>,
): number {
  if (tasks.length === 0) return 0;
  let total = 0;
  let done = 0;
  for (const t of tasks) {
    const w = resolveTaskMarksWeight(t, microtopicById);
    total += w;
    if (isTaskCompleted(t)) done += w;
  }
  if (total <= 0) return 0;
  return Math.round((done / total) * 1000) / 10;
}

/**
 * @param unifiedPlanTaskCount When &gt; 0, today has unified `daily_tasks` even if
 *   academic `tasks` for this date are empty — don’t treat as “no scope”.
 */
export function classifyProgressMessageWithScope(
  tasks: Task[],
  weightedPercent: number,
  unifiedPlanTaskCount = 0,
): ProgressMessage {
  if (tasks.length === 0 && unifiedPlanTaskCount === 0) return "falling_behind";
  if (weightedPercent >= PROGRESS_THRESHOLDS.PERFECT_MIN_PERCENT) return "perfect";
  if (weightedPercent >= PROGRESS_THRESHOLDS.PARTIAL_MIN_PERCENT) return "partial";
  return "falling_behind";
}

export function classifyDailyProgressBand(
  weightedPercent: number,
  totalToday: number,
): "flawless" | "strong" | "mediocre" | "danger" | "no_plan" {
  if (totalToday === 0) return "no_plan";
  if (weightedPercent >= 100) return "flawless";
  if (weightedPercent >= 80) return "strong";
  if (weightedPercent >= 50) return "mediocre";
  return "danger";
}

export function findMissedIncompleteTasks(
  tasks: Task[],
  todayCalendarDate: string,
): Task[] {
  const todayKey = toCalendarDateKey(todayCalendarDate) ?? todayCalendarDate;
  return tasks.filter((t) => {
    const d = toCalendarDateKey(t.assigned_date);
    if (d == null) return false;
    return !isTaskCompleted(t) && d < todayKey;
  });
}

export function summarizeDailyReset(
  tasks: Task[],
  todayCalendarDate: string,
  microtopicById: Record<string, Microtopic>,
) {
  const missedTasks = findMissedIncompleteTasks(tasks, todayCalendarDate);
  let missedWeight = 0;
  for (const t of missedTasks) {
    missedWeight += resolveTaskMarksWeight(t, microtopicById);
  }
  return {
    missedTasks,
    missedCount: missedTasks.length,
    missedWeight,
  };
}

export function computeDaysBehindExecution(
  tasks: Task[],
  todayCalendarDate: string,
): number | null {
  if (tasks.length === 0) return null;
  const completed = tasks.filter(isTaskCompleted);
  let ref: string;
  if (completed.length > 0) {
    ref = completed.reduce(
      (a, t) => (t.assigned_date > a ? t.assigned_date : a),
      completed[0].assigned_date,
    );
  } else {
    const dates = [...new Set(tasks.map((t) => t.assigned_date))].sort();
    ref = dates[0]!;
  }
  return differenceInCalendarDays(
    parseISO(todayCalendarDate),
    parseISO(ref),
  );
}

export function filterTasksThroughDate(
  tasks: Task[],
  todayCalendarDate: string,
): Task[] {
  const endKey = toCalendarDateKey(todayCalendarDate) ?? todayCalendarDate;
  return tasks.filter((t) => {
    const d = toCalendarDateKey(t.assigned_date);
    return d != null && d <= endKey;
  });
}

export function filterTasksForDate(
  tasks: Task[],
  calendarDate: string,
): Task[] {
  const want = toCalendarDateKey(calendarDate) ?? calendarDate;
  return tasks.filter((t) => toCalendarDateKey(t.assigned_date) === want);
}

/** Sum of marks weights for a day’s tasks (planned load). */
export function sumPlannedMarksWeight(
  tasks: Task[],
  microtopicById: Record<string, Microtopic>,
): number {
  let s = 0;
  for (const t of tasks) {
    s += resolveTaskMarksWeight(t, microtopicById);
  }
  return Math.round(s * 10) / 10;
}

export function sumEstimatedMinutes(tasks: Task[]): number {
  let s = 0;
  for (const t of tasks) {
    s += t.estimated_minutes ?? t.estimated_time_minutes ?? 0;
  }
  return Math.round(s);
}

export type DailyProgressBand = ReturnType<typeof classifyDailyProgressBand>;

/** Intense, execution-focused feedback from weighted daily completion %. */
export const DAILY_PROGRESS_HEADLINE: Record<DailyProgressBand, string> = {
  flawless: "Flawless Execution. You won the day.",
  strong: "Solid ground taken. Close the gap tomorrow.",
  mediocre: "Mediocre execution. You left marks on the table.",
  danger:
    "Danger zone. You are letting your rank slip. Reclaim your focus.",
  no_plan:
    "Zero execution logged. Master your plan — lock targets and capture the day.",
};

export const DAILY_PROGRESS_PILL: Record<DailyProgressBand, string> = {
  flawless: "Flawless",
  strong: "Strong",
  mediocre: "Mediocre",
  danger: "Danger",
  no_plan: "No plan",
};
