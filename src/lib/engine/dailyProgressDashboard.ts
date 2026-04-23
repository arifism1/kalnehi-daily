import { format, subDays } from "date-fns";

import type { DailyPlanProgressMap } from "@/lib/effectiveDayCompletion";
import {
  classifyDailyProgressBand,
  classifyProgressMessageWithScope,
  computeDaysBehindExecution,
  computeWeightedCompletionPercent,
  filterTasksForDate,
  filterTasksThroughDate,
  PROGRESS_THRESHOLDS,
} from "@/lib/progressEngine";
import type { Microtopic, Task } from "@/store/useTaskStore";

export type DayTrend = {
  date: string;
  weightedPercent: number;
  band: ReturnType<typeof classifyDailyProgressBand>;
  taskCount: number;
};

export function buildSevenDayTrend(
  today: string,
  allTasks: Task[],
  microtopicById: Record<string, Microtopic>,
  dailyPlanOverlay?: DailyPlanProgressMap | null,
): DayTrend[] {
  const out: DayTrend[] = [];
  const ref = new Date(today + "T12:00:00");
  for (let i = 6; i >= 0; i--) {
    const d = subDays(ref, i);
    const date = format(d, "yyyy-MM-dd");

    const planSnap = dailyPlanOverlay?.get(date);
    if (planSnap && planSnap.totalCount > 0) {
      out.push({
        date,
        weightedPercent: planSnap.percent,
        band: classifyDailyProgressBand(planSnap.percent, planSnap.totalCount),
        taskCount: planSnap.totalCount,
      });
      continue;
    }

    const dayTasks = filterTasksForDate(allTasks, date);
    const weightedPercent =
      dayTasks.length === 0
        ? 0
        : computeWeightedCompletionPercent(dayTasks, microtopicById);
    const band = classifyDailyProgressBand(weightedPercent, dayTasks.length);
    out.push({ date, weightedPercent, band, taskCount: dayTasks.length });
  }
  return out;
}

export type DailyEngineSnapshot = {
  todayWeightedPercent: number;
  todayBand: ReturnType<typeof classifyDailyProgressBand>;
  progressMessage: ReturnType<typeof classifyProgressMessageWithScope>;
  sevenDayAvg: number;
  trend: DayTrend[];
  daysBehind: number | null;
  realityWeightedPercent: number;
};

export function buildDailyEngineSnapshot(
  today: string,
  allTasks: Task[],
  microtopicById: Record<string, Microtopic>,
  dailyPlanOverlay?: DailyPlanProgressMap | null,
): DailyEngineSnapshot {
  const realityTasks = filterTasksThroughDate(allTasks, today);
  const todayTasks = filterTasksForDate(allTasks, today);

  const planTodaySnap = dailyPlanOverlay?.get(today);
  const todayWeighted =
    planTodaySnap && planTodaySnap.totalCount > 0
      ? planTodaySnap.percent
      : computeWeightedCompletionPercent(todayTasks, microtopicById);
  const todayCount =
    planTodaySnap && planTodaySnap.totalCount > 0
      ? planTodaySnap.totalCount
      : todayTasks.length;

  const todayBand = classifyDailyProgressBand(todayWeighted, todayCount);
  const progressMessage = classifyProgressMessageWithScope(
    todayTasks,
    todayWeighted,
    planTodaySnap && planTodaySnap.totalCount > 0 ? planTodaySnap.totalCount : 0,
  );

  const trend = buildSevenDayTrend(today, allTasks, microtopicById, dailyPlanOverlay);
  const withData = trend.filter((t) => t.taskCount > 0);
  const sevenDayAvg =
    withData.length === 0
      ? 0
      : Math.round(
          (withData.reduce((s, t) => s + t.weightedPercent, 0) /
            withData.length) *
            10,
        ) / 10;

  const realityWeighted = computeWeightedCompletionPercent(
    realityTasks,
    microtopicById,
  );

  return {
    todayWeightedPercent: todayWeighted,
    todayBand,
    progressMessage,
    sevenDayAvg,
    trend,
    daysBehind: computeDaysBehindExecution(allTasks, today),
    realityWeightedPercent: realityWeighted,
  };
}
