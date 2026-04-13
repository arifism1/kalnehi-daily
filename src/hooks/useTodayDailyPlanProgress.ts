"use client";

import { useCallback, useEffect, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useCalendarDate } from "@/hooks/useCalendarDate";

export type TodayDailyPlanProgress = {
  /** Total daily_tasks rows for today (0 = none added yet). */
  totalCount: number;
  /** Rows with status = 'done'. */
  doneCount: number;
  /** 0–100 integer percent. */
  percent: number;
};

const EMPTY: TodayDailyPlanProgress = { totalCount: 0, doneCount: 0, percent: 0 };

/**
 * Reads today's daily_tasks completion from Supabase.
 * Re-fires whenever the `kalnehi-daily-plan-synced` event is dispatched,
 * so the Home ring updates the moment a task is ticked anywhere.
 */
export function useTodayDailyPlanProgress(): TodayDailyPlanProgress {
  const today = useCalendarDate();
  const userId = useAuthStore((s) => s.user?.id);
  const [progress, setProgress] = useState<TodayDailyPlanProgress>(EMPTY);

  const refresh = useCallback(async () => {
    if (!userId) {
      setProgress(EMPTY);
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();

      // Look up today's plan row
      const { data: plan } = await supabase
        .from("daily_plans")
        .select("id")
        .eq("user_id", userId)
        .eq("plan_date", today)
        .maybeSingle();

      if (!plan?.id) {
        setProgress(EMPTY);
        return;
      }

      // Fetch only the status column — lightweight query
      const { data: rows } = await supabase
        .from("daily_tasks")
        .select("status")
        .eq("daily_plan_id", plan.id);

      if (!rows || rows.length === 0) {
        setProgress(EMPTY);
        return;
      }

      const totalCount = rows.length;
      const doneCount = rows.filter((r) => r.status === "done").length;
      const percent = Math.round((doneCount / totalCount) * 100);

      setProgress({ totalCount, doneCount, percent });
    } catch {
      // Silently keep last known value — don't break the home page
    }
  }, [userId, today]);

  // Initial load + re-load when date or user changes
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Live update: fires when any planner page ticks/adds/deletes a task
  useEffect(() => {
    const handler = () => void refresh();
    window.addEventListener("kalnehi-daily-plan-synced", handler);
    return () => window.removeEventListener("kalnehi-daily-plan-synced", handler);
  }, [refresh]);

  return progress;
}
