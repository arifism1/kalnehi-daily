"use client";

import { addDays, format, parseISO } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";

import { timeDbToInput } from "@/lib/dailyPlanTime";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { minutesBetweenHHMM } from "@/lib/voiceIst";
import { useAuthStore } from "@/store/useAuthStore";
import { useCalendarDate } from "@/hooks/useCalendarDate";

export type DailyPlanDayProgress = {
  totalCount: number;
  doneCount: number;
  percent: number;
};

export type DailyPlanTomorrowLoad = {
  taskCount: number;
  /** Sum of slot lengths (time_start→time_end) where both exist; 0 if none. */
  totalMinutes: number;
};

export type DailyPlanHomeExecution = {
  yesterday: DailyPlanDayProgress;
  today: DailyPlanDayProgress;
  tomorrow: DailyPlanTomorrowLoad;
};

const EMPTY_DAY: DailyPlanDayProgress = { totalCount: 0, doneCount: 0, percent: 0 };
const EMPTY_TOMORROW: DailyPlanTomorrowLoad = { taskCount: 0, totalMinutes: 0 };
const EMPTY: DailyPlanHomeExecution = {
  yesterday: EMPTY_DAY,
  today: EMPTY_DAY,
  tomorrow: EMPTY_TOMORROW,
};

function progressFromStatuses(
  rows: Array<{ status: string }> | null | undefined,
): DailyPlanDayProgress {
  if (!rows?.length) return EMPTY_DAY;
  const totalCount = rows.length;
  const doneCount = rows.filter((r) => r.status === "done").length;
  const percent = Math.round((doneCount / totalCount) * 100);
  return { totalCount, doneCount, percent };
}

function sumSlotMinutes(
  rows: Array<{
    time_start: string | null;
    time_end: string | null;
  }> | null | undefined,
): number {
  if (!rows?.length) return 0;
  let sum = 0;
  for (const r of rows) {
    const s = r.time_start ? timeDbToInput(r.time_start) : "";
    const e = r.time_end ? timeDbToInput(r.time_end) : "";
    const m = minutesBetweenHHMM(s, e);
    if (m != null) sum += m;
  }
  return sum;
}

/**
 * Loads unified `daily_tasks` completion for yesterday / today / tomorrow (via `daily_plans.plan_date`).
 * Re-fetches on `kalnehi-daily-plan-synced` so home updates when tasks are ticked anywhere.
 */
export function useDailyPlanHomeExecution(): DailyPlanHomeExecution {
  const today = useCalendarDate();
  const yesterday = useMemo(
    () => format(addDays(parseISO(today), -1), "yyyy-MM-dd"),
    [today],
  );
  const tomorrow = useMemo(
    () => format(addDays(parseISO(today), 1), "yyyy-MM-dd"),
    [today],
  );

  const userId = useAuthStore((s) => s.user?.id);
  const [metrics, setMetrics] = useState<DailyPlanHomeExecution>(EMPTY);

  const refresh = useCallback(async () => {
    if (!userId) {
      setMetrics(EMPTY);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();

      const { data: plans, error: planErr } = await supabase
        .from("daily_plans")
        .select("id, plan_date")
        .eq("user_id", userId)
        .in("plan_date", [yesterday, today, tomorrow]);

      if (planErr) throw planErr;

      const planByDate = new Map<string, string>();
      for (const p of plans ?? []) {
        if (p.plan_date && p.id) planByDate.set(p.plan_date, p.id);
      }

      const yId = planByDate.get(yesterday);
      const tId = planByDate.get(today);
      const mId = planByDate.get(tomorrow);

      const ids = [yId, tId, mId].filter(Boolean) as string[];
      if (ids.length === 0) {
        setMetrics(EMPTY);
        return;
      }

      const { data: taskRows, error: taskErr } = await supabase
        .from("daily_tasks")
        .select("daily_plan_id, status, time_start, time_end")
        .in("daily_plan_id", ids);

      if (taskErr) throw taskErr;

      const byPlan = new Map<string, typeof taskRows>();
      for (const row of taskRows ?? []) {
        const pid = row.daily_plan_id;
        const list = byPlan.get(pid) ?? [];
        list.push(row);
        byPlan.set(pid, list);
      }

      const yRows = yId ? byPlan.get(yId) : undefined;
      const todayRows = tId ? byPlan.get(tId) : undefined;
      const tomRows = mId ? byPlan.get(mId) : undefined;

      setMetrics({
        yesterday: progressFromStatuses(yRows),
        today: progressFromStatuses(todayRows),
        tomorrow: {
          taskCount: tomRows?.length ?? 0,
          totalMinutes: sumSlotMinutes(tomRows),
        },
      });
    } catch {
      // Keep last good snapshot; home must stay usable offline / on error
    }
  }, [userId, yesterday, today, tomorrow]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const handler = () => void refresh();
    window.addEventListener("kalnehi-daily-plan-synced", handler);
    return () => window.removeEventListener("kalnehi-daily-plan-synced", handler);
  }, [refresh]);

  return metrics;
}
