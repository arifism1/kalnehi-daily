import { eachDayOfInterval, endOfMonth, format, startOfMonth } from "date-fns";

import type { DailyPlanProgressMap } from "@/lib/effectiveDayCompletion";
import {
  computeWeightedCompletionPercent,
  filterTasksForDate,
} from "@/lib/progressEngine";
import type { Microtopic, Task } from "@/store/useTaskStore";

export type DayHeatCell = {
  date: string;
  /** ISO date yyyy-MM-dd */
  weekday: number;
  weightedPercent: number | null;
  /** green | yellow | red | grey */
  band: "green" | "yellow" | "red" | "grey";
  taskCount: number;
};

function bandForPercent(p: number | null): DayHeatCell["band"] {
  if (p == null) return "grey";
  if (p > 80) return "green";
  if (p >= 50) return "yellow";
  return "red";
}

/**
 * Build a per-day heatmap for a calendar month.
 *
 * When `dailyPlanOverlay` is provided, each day prefers the unified
 * daily-plan percent (from `daily_tasks`) over the weighted academic-task
 * completion — matching the same priority rule used on the Home dashboard.
 * Days without a daily-plan entry fall back to `tasks`-based calculation.
 */
export function buildMonthHeatmap(
  year: number,
  monthIndex0: number,
  allTasks: Task[],
  microtopicById: Record<string, Microtopic>,
  dailyPlanOverlay?: DailyPlanProgressMap | null,
): DayHeatCell[] {
  const start = startOfMonth(new Date(year, monthIndex0, 1));
  const end = endOfMonth(start);
  const days = eachDayOfInterval({ start, end });

  return days.map((d) => {
    const date = format(d, "yyyy-MM-dd");

    const planSnap = dailyPlanOverlay?.get(date);
    if (planSnap && planSnap.totalCount > 0) {
      return {
        date,
        weekday: d.getDay(),
        weightedPercent: planSnap.percent,
        band: bandForPercent(planSnap.percent),
        taskCount: planSnap.totalCount,
      };
    }

    const dayTasks = filterTasksForDate(allTasks, date);
    const taskCount = dayTasks.length;
    const weightedPercent =
      taskCount === 0
        ? null
        : computeWeightedCompletionPercent(dayTasks, microtopicById);
    return {
      date,
      weekday: d.getDay(),
      weightedPercent,
      band: bandForPercent(weightedPercent),
      taskCount,
    };
  });
}

export function monthLabel(year: number, monthIndex0: number): string {
  return format(new Date(year, monthIndex0, 1), "MMMM yyyy");
}
