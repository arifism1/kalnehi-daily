"use client";

import { useCallback } from "react";

import { buildPrepBrainContext, type PrepBrainContext } from "@/lib/prepBrainContext";
import {
  isUpscCseMainsExam,
  UPSC_CSE_MAINS_UI_TOTAL_MARKS,
  upscMainsSyllabusUiPercent,
} from "@/lib/upscMainsOptionalSubjects";
import { getHabitBundleCached } from "@/lib/habitLocal";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { getAllExecutionSessions } from "@/lib/taskIdb";
import { getAllStudySessions } from "@/lib/studySessionsIdb";
import { useAuthStore } from "@/store/useAuthStore";
import { useTaskStore } from "@/store/useTaskStore";

import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useSyllabusTracker } from "@/hooks/useSyllabusTracker";
import { useTargetExamDate } from "@/hooks/useTargetExamDate";
import { useTargetExamDisplay } from "@/hooks/useTargetExamDisplay";

async function fetchMeditation30d(userId: string): Promise<{
  sessionCount: number;
  distinctDays: number;
}> {
  try {
    const supabase = getSupabaseBrowserClient();
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const ymd = since.toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("meditation_sessions")
      .select("date")
      .eq("user_id", userId)
      .gte("date", ymd);
    if (error || !data) return { sessionCount: 0, distinctDays: 0 };
    const days = new Set(data.map((r) => r.date));
    return { sessionCount: data.length, distinctDays: days.size };
  } catch {
    return { sessionCount: 0, distinctDays: 0 };
  }
}

/**
 * Builds the same PrepBrain JSON snapshot used by PrepBrain AI (tasks, syllabus, habits, etc.).
 */
export function usePrepBrainContextSnapshot() {
  const user = useAuthStore((s) => s.user);
  const tasksRecord = useTaskStore((s) => s.tasks);
  const microtopics = useTaskStore((s) => s.microtopics);
  const calendarToday = useCalendarDate();
  const { examLabel, examDisplayName } = useTargetExamDisplay();
  const { examDate: targetExamDate } = useTargetExamDate();
  const {
    rollup,
    neetYearProjections,
    cuetScoringRollup,
    maxScore,
    primaryMarksYear,
    catalogExamKey,
  } = useSyllabusTracker();

  const buildContextSnapshot = useCallback(async (): Promise<PrepBrainContext> => {
    const tasks = Object.values(tasksRecord);
    const nowIso = new Date().toISOString();

    const [executionSessions, studySessions, habitBundle, meditation30d] =
      await Promise.all([
        getAllExecutionSessions(),
        getAllStudySessions(),
        user?.id ? getHabitBundleCached(user.id) : Promise.resolve(null),
        user?.id
          ? fetchMeditation30d(user.id)
          : Promise.resolve({ sessionCount: 0, distinctDays: 0 }),
      ]);

    const upscUi =
      isUpscCseMainsExam(catalogExamKey) && rollup
        ? {
            overall_weighted_completion_percent: upscMainsSyllabusUiPercent(
              rollup.totalMarksMastered,
            ),
            total_marks_pool_in_syllabus_model: UPSC_CSE_MAINS_UI_TOTAL_MARKS,
          }
        : null;

    return buildPrepBrainContext({
      nowIso,
      calendarToday,
      examLabel,
      examDisplayName,
      targetExamDate,
      maxScore,
      primaryMarksYear,
      rollup,
      neetYearProjections,
      cuetScoringRollup,
      tasks,
      microtopicById: microtopics,
      executionSessions,
      studySessions,
      habitBundle,
      meditation30d,
      syllabus_snapshot_overrides: upscUi,
    });
  }, [
    tasksRecord,
    microtopics,
    calendarToday,
    examLabel,
    examDisplayName,
    targetExamDate,
    maxScore,
    primaryMarksYear,
    rollup,
    neetYearProjections,
    cuetScoringRollup,
    user,
    catalogExamKey,
  ]);

  return { buildContextSnapshot };
}
