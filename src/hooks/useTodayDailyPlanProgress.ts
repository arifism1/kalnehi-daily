"use client";

import { useDailyPlanHomeExecution } from "@/hooks/useDailyPlanHomeExecution";

export type TodayDailyPlanProgress =
  import("@/hooks/useDailyPlanHomeExecution").DailyPlanDayProgress;

/**
 * Today's slice of {@link useDailyPlanHomeExecution} (same batched fetch).
 * Prefer `useDailyPlanHomeExecution` on the home page to avoid two subscriptions.
 */
export function useTodayDailyPlanProgress(): TodayDailyPlanProgress {
  return useDailyPlanHomeExecution().today;
}
