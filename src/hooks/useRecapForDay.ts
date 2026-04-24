"use client";

import { format, parseISO, subDays } from "date-fns";
import { useEffect, useMemo, useState } from "react";

import { useDailyPlanExecutionForRange } from "@/hooks/useDailyPlanExecutionForRange";
import {
  computeDayExecutionSnapshot,
  computeExecutionStreak,
} from "@/lib/dailyExecutionStats";
import {
  sumStudySecondsForCalendarDay,
} from "@/lib/recapSessionStats";
import { getAllExecutionSessions } from "@/lib/taskIdb";
import { getAllStudySessions } from "@/lib/studySessionsIdb";
import { useAuthStore } from "@/store/useAuthStore";
import { useTaskStore } from "@/store/useTaskStore";

export type RecapForDayState = {
  loading: boolean;
  studySeconds: number;
  streakDays: number;
  plannedTasks: number;
  completedTasks: number;
  weightedPercent: number;
};

export function useRecapForDay(calendarDate: string): RecapForDayState {
  const authInitialized = useAuthStore((s) => s.initialized);
  const tasksRecord = useTaskStore((s) => s.tasks);
  const microRecord = useTaskStore((s) => s.microtopics);

  const overlayStart = useMemo(
    () => format(subDays(parseISO(calendarDate), 120), "yyyy-MM-dd"),
    [calendarDate],
  );
  const dailyPlanOverlay = useDailyPlanExecutionForRange(
    overlayStart,
    calendarDate,
  );

  const allTasks = useMemo(() => Object.values(tasksRecord), [tasksRecord]);

  const snapshot = useMemo(
    () =>
      computeDayExecutionSnapshot(
        allTasks,
        microRecord,
        calendarDate,
        dailyPlanOverlay,
      ),
    [allTasks, microRecord, calendarDate, dailyPlanOverlay],
  );

  const streakDays = useMemo(
    () =>
      computeExecutionStreak(
        allTasks,
        microRecord,
        calendarDate,
        60,
        120,
        dailyPlanOverlay,
      ),
    [allTasks, microRecord, calendarDate, dailyPlanOverlay],
  );

  const [studySeconds, setStudySeconds] = useState(0);
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
          setStudySeconds(sumStudySecondsForCalendarDay(calendarDate, exec, study));
        }
      } catch {
        if (!cancelled) setStudySeconds(0);
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
  }, [calendarDate]);

  // Loading is true while auth hasn't resolved yet, OR while sessions are fetching.
  // Once auth is resolved and userId is absent, we are NOT loading — we just have
  // no server sessions, so we fall back to local-only data.
  const loading = !authInitialized || sessionsLoading;

  return {
    loading,
    studySeconds,
    streakDays,
    plannedTasks: snapshot.plannedTasks,
    completedTasks: snapshot.completedTasks,
    weightedPercent: snapshot.weightedPercent,
  };
}
