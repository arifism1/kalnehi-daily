import { format, parseISO, subDays } from "date-fns";

import {
  computeWeightedCompletionPercent,
  filterTasksForDate,
  isTaskCompleted,
  sumEstimatedMinutes,
} from "@/lib/progressEngine";
import type { Microtopic, Task } from "@/store/useTaskStore";

export type DayExecutionSnapshot = {
  date: string;
  /** Short label e.g. Mon, Tue */
  dow: string;
  plannedTasks: number;
  completedTasks: number;
  /** 0–100 weighted by marks; 0 if no tasks */
  weightedPercent: number;
  plannedMinutes: number;
  /** Sum of time_spent_seconds on tasks assigned this day */
  actualSecondsLogged: number;
};

function sumTimeSpentSeconds(tasks: Task[]): number {
  let s = 0;
  for (const t of tasks) {
    s += t.time_spent_seconds ?? 0;
  }
  return s;
}

/** Stats for tasks planned on a single calendar day. */
export function computeDayExecutionSnapshot(
  allTasks: Task[],
  microtopicById: Record<string, Microtopic>,
  calendarDate: string,
): DayExecutionSnapshot {
  const dayTasks = filterTasksForDate(allTasks, calendarDate);
  const plannedTasks = dayTasks.length;
  const completedTasks = dayTasks.filter(isTaskCompleted).length;
  const weightedPercent =
    plannedTasks === 0
      ? 0
      : computeWeightedCompletionPercent(dayTasks, microtopicById);
  const plannedMinutes = sumEstimatedMinutes(dayTasks);
  const actualSecondsLogged = sumTimeSpentSeconds(dayTasks);

  return {
    date: calendarDate,
    dow: format(parseISO(calendarDate), "EEE"),
    plannedTasks,
    completedTasks,
    weightedPercent,
    plannedMinutes,
    actualSecondsLogged,
  };
}

export type DailyExecutionSeriesPoint = {
  date: string;
  dow: string;
  percent: number;
  hasPlan: boolean;
};

/** Last N calendar days ending at `endDate` (inclusive), oldest first. */
export function buildDailyExecutionSeries(
  allTasks: Task[],
  microtopicById: Record<string, Microtopic>,
  endDate: string,
  numDays: number,
): DailyExecutionSeriesPoint[] {
  const end = parseISO(endDate);
  const out: DailyExecutionSeriesPoint[] = [];
  for (let i = numDays - 1; i >= 0; i--) {
    const d = format(subDays(end, i), "yyyy-MM-dd");
    const snap = computeDayExecutionSnapshot(allTasks, microtopicById, d);
    out.push({
      date: d,
      dow: snap.dow,
      percent: snap.weightedPercent,
      hasPlan: snap.plannedTasks > 0,
    });
  }
  return out;
}

/**
 * Consecutive days ending at `endDate` where the user had at least one planned
 * task and weighted completion meets `minPercent`. Empty plan days break the streak.
 */
export function computeExecutionStreak(
  allTasks: Task[],
  microtopicById: Record<string, Microtopic>,
  endDate: string,
  minPercent = 60,
  maxDaysBack = 120,
): number {
  let streak = 0;
  const end = parseISO(endDate);
  for (let i = 0; i < maxDaysBack; i++) {
    const d = format(subDays(end, i), "yyyy-MM-dd");
    const snap = computeDayExecutionSnapshot(allTasks, microtopicById, d);
    if (snap.plannedTasks === 0) break;
    if (snap.weightedPercent >= minPercent) streak += 1;
    else break;
  }
  return streak;
}

/** Mean weighted % over days that had a plan; null if none. */
function averagePercentWherePlanned(points: DailyExecutionSeriesPoint[]): number | null {
  const withPlan = points.filter((p) => p.hasPlan);
  if (withPlan.length === 0) return null;
  const sum = withPlan.reduce((a, p) => a + p.percent, 0);
  return sum / withPlan.length;
}

export type WeekOverWeekExecution = {
  thisWeekAvg: number | null;
  lastWeekAvg: number | null;
  /** Positive = more consistent this week (percentage points) */
  deltaPoints: number | null;
};

export function compareExecutionWeekOverWeek(
  allTasks: Task[],
  microtopicById: Record<string, Microtopic>,
  today: string,
): WeekOverWeekExecution {
  const thisWeek = buildDailyExecutionSeries(allTasks, microtopicById, today, 7);
  const endPrev = format(subDays(parseISO(today), 7), "yyyy-MM-dd");
  const lastWeek = buildDailyExecutionSeries(
    allTasks,
    microtopicById,
    endPrev,
    7,
  );
  const thisWeekAvg = averagePercentWherePlanned(thisWeek);
  const lastWeekAvg = averagePercentWherePlanned(lastWeek);
  if (thisWeekAvg == null || lastWeekAvg == null) {
    return { thisWeekAvg, lastWeekAvg, deltaPoints: null };
  }
  return {
    thisWeekAvg,
    lastWeekAvg,
    deltaPoints: Math.round((thisWeekAvg - lastWeekAvg) * 10) / 10,
  };
}

export function formatMinutesShort(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  if (m === 0) return "0m";
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}m`;
  if (r === 0) return `${h}h`;
  return `${h}h ${r}m`;
}

export function formatSecondsShort(totalSeconds: number): string {
  return formatMinutesShort(Math.round(totalSeconds / 60));
}
