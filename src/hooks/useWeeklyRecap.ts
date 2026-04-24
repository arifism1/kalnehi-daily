"use client";

import { format, parseISO, subDays } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useDailyPlanExecutionForRange } from "@/hooks/useDailyPlanExecutionForRange";
import {
  buildDailyExecutionSeries,
  compareExecutionWeekOverWeek,
} from "@/lib/dailyExecutionStats";
import { sumStudySecondsForCalendarDay } from "@/lib/recapSessionStats";
import { getAllExecutionSessions } from "@/lib/taskIdb";
import { getAllStudySessions } from "@/lib/studySessionsIdb";
import { useAuthStore } from "@/store/useAuthStore";
import { useTaskStore } from "@/store/useTaskStore";

export type WeeklyRecapDay = {
  date: string;
  dow: string;
  percent: number;
  hasPlan: boolean;
  studySeconds: number;
};

export type WeeklyRecapState = {
  loading: boolean;
  days: WeeklyRecapDay[];
  weekStudySeconds: number;
  wowDelta: number | null;
  rangeLabel: string;
};

export function useWeeklyRecap(endDate: string): WeeklyRecapState {
  const userId = useAuthStore((s) => s.user?.id);
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
        7,
        dailyPlanOverlay,
      ),
    [allTasks, microRecord, endDate, dailyPlanOverlay],
  );

  const wow = useMemo(
    () =>
      compareExecutionWeekOverWeek(
        allTasks,
        microRecord,
        endDate,
        dailyPlanOverlay,
      ),
    [allTasks, microRecord, endDate, dailyPlanOverlay],
  );

  const [secondsByDay, setSecondsByDay] = useState<Record<string, number>>({});
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const [exec, study] = await Promise.all([
        getAllExecutionSessions(),
        getAllStudySessions(),
      ]);
      const map: Record<string, number> = {};
      for (const p of series) {
        map[p.date] = sumStudySecondsForCalendarDay(p.date, exec, study);
      }
      setSecondsByDay(map);
    } catch {
      setSecondsByDay({});
    } finally {
      setSessionsLoading(false);
    }
  }, [series]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    const onExec = () => void loadSessions();
    const onStudy = () => void loadSessions();
    window.addEventListener("kalnehi-execution-log-changed", onExec);
    window.addEventListener("kalnehi-study-sessions-changed", onStudy);
    return () => {
      window.removeEventListener("kalnehi-execution-log-changed", onExec);
      window.removeEventListener("kalnehi-study-sessions-changed", onStudy);
    };
  }, [loadSessions]);

  const days: WeeklyRecapDay[] = useMemo(
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

  const weekStudySeconds = useMemo(
    () => days.reduce((a, d) => a + d.studySeconds, 0),
    [days],
  );

  const rangeLabel = useMemo(() => {
    if (days.length === 0) return "";
    const a = days[0].date;
    const b = days[days.length - 1].date;
    return `${a.slice(5)} → ${b.slice(5)}`;
  }, [days]);

  const loading = !userId || sessionsLoading;

  return {
    loading,
    days,
    weekStudySeconds,
    wowDelta: wow.deltaPoints,
    rangeLabel,
  };
}
