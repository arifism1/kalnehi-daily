"use client";

import { differenceInCalendarDays, startOfDay } from "date-fns";
import { useMemo } from "react";

import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useDailyPlanExecutionForRange } from "@/hooks/useDailyPlanExecutionForRange";
import { useSyllabusTracker } from "@/hooks/useSyllabusTracker";
import { useTargetExamDate } from "@/hooks/useTargetExamDate";
import { useTargetExamDisplay } from "@/hooks/useTargetExamDisplay";
import { getMorningQuoteForDay } from "@/components/welcome/motivational/morningQuotes";
import { getNightQuoteForDay } from "@/components/welcome/motivational/nightQuotes";
import { computeDayExecutionSnapshot } from "@/lib/dailyExecutionStats";
import { useAuthStore } from "@/store/useAuthStore";
import { useTaskStore } from "@/store/useTaskStore";

function localStartOfExamDay(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

function getFirstName(user: ReturnType<typeof useAuthStore.getState>["user"]): string {
  if (!user) return "Aspirant";
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fromMeta =
    (typeof meta?.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta?.name === "string" && meta.name.trim()) ||
    null;
  if (fromMeta) {
    const part = fromMeta.split(/\s+/)[0]?.trim();
    return part || "Aspirant";
  }
  if (typeof user.email === "string" && user.email.includes("@")) {
    return user.email.split("@")[0] ?? "Aspirant";
  }
  return "Aspirant";
}

/**
 * Data for the morning welcome: name, long exam label, day countdown, line of the day.
 */
export function useMorningWelcomeData() {
  const user = useAuthStore((s) => s.user);
  const { examDisplayName, examLabel, catalogLoading, examLabelLoading } =
    useTargetExamDisplay();
  const { examDate, loading: dateLoading } = useTargetExamDate();

  const firstName = useMemo(() => getFirstName(user), [user]);
  const quote = useMemo(
    () => getMorningQuoteForDay(new Date().getDay()),
    [],
  );

  const examCountdownText = useMemo(() => {
    const label = examDisplayName || examLabel || "your exam";
    if (!examDate) {
      return `Set a target date for ${label} in Profile to see the countdown.`;
    }
    const examStart = localStartOfExamDay(examDate);
    const now = new Date();
    if (examStart.getTime() <= now.getTime()) {
      return `${label} — exam day. Walk in calm, walk out proud.`;
    }
    const days = Math.max(
      0,
      differenceInCalendarDays(startOfDay(examStart), startOfDay(now)),
    );
    return `${days} day${days === 1 ? "" : "s"} to ${label}`;
  }, [examDate, examDisplayName, examLabel]);

  return {
    firstName,
    examCountdownText,
    quote,
    loading: examLabelLoading || catalogLoading || dateLoading,
  };
}

/**
 * Today’s task/time stats + syllabus % + night line for shutdown screen.
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
