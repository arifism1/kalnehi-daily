"use client";

import { format, parseISO, subDays } from "date-fns";
import { useEffect, useMemo, useState } from "react";

import { useDailyPlanExecutionForRange } from "@/hooks/useDailyPlanExecutionForRange";
import {
  buildDailyExecutionSeries,
  compareExecutionMonthOverMonth,
  MONTHLY_RECAP_WINDOW_DAYS,
} from "@/lib/dailyExecutionStats";
import { sumStudySecondsForCalendarDay } from "@/lib/recapSessionStats";
import { getAllExecutionSessions } from "@/lib/taskIdb";
import { getAllStudySessions } from "@/lib/studySessionsIdb";
import { useAuthStore } from "@/store/useAuthStore";
import { useTaskStore } from "@/store/useTaskStore";

export type MonthlyRecapDay = {
  date: string;
  dow: string;
  percent: number;
  hasPlan: boolean;
  studySeconds: number;
};

export type MonthlyRecapState = {
  loading: boolean;
  days: MonthlyRecapDay[];
  monthStudySeconds: number;
  /** Avg execution delta vs prior trailing 30 days (percentage points); null if not comparable */
  priorWindowDelta: number | null;
  rangeLabel: string;
};

export function useMonthlyRecap(endDate: string): MonthlyRecapState {
  const authInitialized = useAuthStore((s) => s.initialized);
  const tasksRecord = useTaskStore((s) => s.tasks);
  const microRecord = useTaskStore((s) => s.microtopics);

  const overlayStart = useMemo(
    () => format(subDays(parseISO(endDate), 120), "yyyy-MM-dd"),
    [endDate],
  );
  const dailyPlanOverlay = useDailyPlanExecutionForRange(overlayStart, endDate);

  const allTasks = useMemo(() => Object.values(tasksRecord), [tasksRecord]);

  const series = useMemo(
    () =>
      buildDailyExecutionSeries(
        allTasks,
        microRecord,
        endDate,
        MONTHLY_RECAP_WINDOW_DAYS,
        dailyPlanOverlay,
      ),
    [allTasks, microRecord, endDate, dailyPlanOverlay],
  );

  const mom = useMemo(
    () =>
      compareExecutionMonthOverMonth(
        allTasks,
        microRecord,
        endDate,
        dailyPlanOverlay,
      ),
    [allTasks, microRecord, endDate, dailyPlanOverlay],
  );

  const [secondsByDay, setSecondsByDay] = useState<Record<string, number>>({});
  const [sessionsLoading, setSessionsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSessions() {
      setSessionsLoading(true);
      try {
        const [exec, study] = await Promise.all([
          getAllExecutionSessions(),
          getAllStudySessions(),
        ]);
        if (!cancelled) {
          const map: Record<string, number> = {};
          for (const p of series) {
            map[p.date] = sumStudySecondsForCalendarDay(p.date, exec, study);
          }
          setSecondsByDay(map);
        }
      } catch {
        if (!cancelled) setSecondsByDay({});
      } finally {
        if (!cancelled) setSessionsLoading(false);
      }
    }

    void loadSessions();

    const onExec = () => void loadSessions();
    const onStudy = () => void loadSessions();
    window.addEventListener("kalnehi-execution-log-changed", onExec);
    window.addEventListener("kalnehi-study-sessions-changed", onStudy);

    return () => {
      cancelled = true;
      window.removeEventListener("kalnehi-execution-log-changed", onExec);
      window.removeEventListener("kalnehi-study-sessions-changed", onStudy);
    };
  }, [series]);

  const days: MonthlyRecapDay[] = useMemo(
    () =>
      series.map((p) => ({
        date: p.date,
        dow: p.dow,
        percent: p.percent,
        hasPlan: p.hasPlan,
        studySeconds: secondsByDay[p.date] ?? 0,
      })),
    [series, secondsByDay],
  );

  const monthStudySeconds = useMemo(
    () => days.reduce((a, d) => a + d.studySeconds, 0),
    [days],
  );

  const rangeLabel = useMemo(() => {
    if (days.length === 0) return "";
    const a = days[0].date;
    const b = days[days.length - 1].date;
    return `${a.slice(5)} → ${b.slice(5)}`;
  }, [days]);

  const loading = !authInitialized || sessionsLoading;

  return {
    loading,
    days,
    monthStudySeconds,
    priorWindowDelta: mom.deltaPoints,
    rangeLabel,
  };
}
