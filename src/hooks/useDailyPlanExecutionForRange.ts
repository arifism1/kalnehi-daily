"use client";

import { useCallback, useEffect, useState } from "react";

import type { DailyPlanProgressMap } from "@/lib/effectiveDayCompletion";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

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
 * Fetches `daily_plans` + `daily_tasks` completion for every calendar date
 * in [`startDate`, `endDate`] (both "yyyy-MM-dd", inclusive).
 *
 * Returns a map from date → {totalCount, doneCount, percent}.
 * An absent key means no daily-plan row exists for that date — callers
 * should fall back to weighted academic-task completion in that case.
 *
 * Re-fetches on `kalnehi-daily-plan-synced` and when the date range changes.
 */
export function useDailyPlanExecutionForRange(
  startDate: string,
  endDate: string,
): DailyPlanProgressMap {
  const userId = useAuthStore((s) => s.user?.id);
  const [progressMap, setProgressMap] = useState<DailyPlanProgressMap>(
    new Map(),
  );

  const refresh = useCallback(async () => {
    if (!userId) {
      setProgressMap(new Map());
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();

      const { data: plans, error: planErr } = await supabase
        .from("daily_plans")
        .select("id, plan_date")
        .eq("user_id", userId)
        .gte("plan_date", startDate)
        .lte("plan_date", endDate);

      if (planErr) throw planErr;
      if (!plans?.length) {
        setProgressMap(new Map());
        return;
      }

      const planDateById = new Map<string, string>();
      for (const p of plans) {
        if (p.id && p.plan_date) planDateById.set(p.id, p.plan_date);
      }

      const planIds = [...planDateById.keys()];

      const { data: taskRows, error: taskErr } = await supabase
        .from("daily_tasks")
        .select("daily_plan_id, status")
        .in("daily_plan_id", planIds);

      if (taskErr) throw taskErr;

      const tasksByPlan = new Map<string, Array<{ status: string }>>();
      for (const row of taskRows ?? []) {
        const pid = row.daily_plan_id;
        const list = tasksByPlan.get(pid) ?? [];
        list.push({ status: row.status });
        tasksByPlan.set(pid, list);
      }

      const next: DailyPlanProgressMap = new Map();
      for (const [planId, planDate] of planDateById) {
        const rows = tasksByPlan.get(planId);
        next.set(planDate, progressFromStatuses(rows));
      }
      setProgressMap(next);
    } catch {
      // Keep last good snapshot on error — callers fall back to tasks
    }
  }, [userId, startDate, endDate]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const handler = () => void refresh();
    window.addEventListener("kalnehi-daily-plan-synced", handler);
    return () => window.removeEventListener("kalnehi-daily-plan-synced", handler);
  }, [refresh]);

  return progressMap;
}
