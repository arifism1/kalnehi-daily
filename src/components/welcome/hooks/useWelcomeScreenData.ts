"use client";

import { useMemo } from "react";

import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useDailyPlanExecutionForRange } from "@/hooks/useDailyPlanExecutionForRange";
import { useSyllabusTracker } from "@/hooks/useSyllabusTracker";
import { getNightQuoteForDay } from "@/components/welcome/motivational/nightQuotes";
import { computeDayExecutionSnapshot } from "@/lib/dailyExecutionStats";
import { useTaskStore } from "@/store/useTaskStore";

/**
 * Today's task/time stats + syllabus % + night line for shutdown screen.
 */
export function useNightShutdownData() {
  const today = useCalendarDate();
  const dailyPlanOverlay = useDailyPlanExecutionForRange(today, today);
  const tasksRecord = useTaskStore((s) => s.tasks);
  const microRecord = useTaskStore((s) => s.microtopics);
  const { rollup, loading: syllabusLoading } = useSyllabusTracker();
  const quote = useMemo(
    () => getNightQuoteForDay(new Date().getDay()),
    [],
  );

  const allTasks = useMemo(() => Object.values(tasksRecord), [tasksRecord]);

  const daySnap = useMemo(
    () =>
      computeDayExecutionSnapshot(
        allTasks,
        microRecord,
        today,
        dailyPlanOverlay,
      ),
    [allTasks, microRecord, today, dailyPlanOverlay],
  );

  const hoursStudied = useMemo(
    () => Math.round((daySnap.actualSecondsLogged / 3600) * 10) / 10,
    [daySnap.actualSecondsLogged],
  );

  const syllabusPercent = syllabusLoading
    ? null
    : Math.round(rollup.overallPercent * 10) / 10;

  return {
    summary: {
      tasksCompleted: daySnap.completedTasks,
      tasksTotal: daySnap.plannedTasks,
      hoursStudied,
      syllabusPercent: syllabusPercent ?? 0,
    },
    nightQuote: quote,
  };
}
