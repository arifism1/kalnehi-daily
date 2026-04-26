"use client";

import { useCallback } from "react";

import {
  fetchDailyPlanExecutionLagDays,
  fetchDailyPlanProgressForDate,
  fetchIncompleteDailyTasksBeforeDate,
} from "@/lib/prepBrainDailyPlanData";
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
import { useAllExamScopes } from "@/hooks/useAllExamScopes";
import { aggregateRollupBySubject } from "@/lib/syllabusRollup";

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
  const { examScopes, isMultiExam } = useAllExamScopes();

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

    const supabase = getSupabaseBrowserClient();
    const [dailyPlanToday, incompleteDailyTasksFromPastDays, dailyPlanExecutionLagDays] =
      user?.id
        ? await Promise.all([
            fetchDailyPlanProgressForDate(supabase, user.id, calendarToday),
            fetchIncompleteDailyTasksBeforeDate(supabase, user.id, calendarToday),
            fetchDailyPlanExecutionLagDays(supabase, user.id, calendarToday),
          ])
        : [null, 0, null];

    const upscUi =
      isUpscCseMainsExam(catalogExamKey) && rollup
        ? {
            overall_weighted_completion_percent: upscMainsSyllabusUiPercent(
              rollup.totalMarksMastered,
            ),
            total_marks_pool_in_syllabus_model: UPSC_CSE_MAINS_UI_TOTAL_MARKS,
          }
        : null;

    const ctx = buildPrepBrainContext({
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
      dailyPlanToday,
      incompleteDailyTasksFromPastDays,
      dailyPlanExecutionLagDays,
    });

    if (isMultiExam && examScopes.length > 0) {
      ctx.all_enrolled_exams = examScopes.map((scope) => {
        const subjectSummaries = aggregateRollupBySubject(scope.rollup).map((s) => ({
          subject: s.subject,
          completion_percent: s.overallPercent,
          marks_secured: s.totalMarksMastered,
          marks_pool: s.totalMarksPool,
        }));
        return {
          exam_label: scope.examLabel,
          exam_display_name: scope.displayName,
          overall_weighted_completion_percent: scope.rollup.overallPercent,
          total_marks_secured: scope.rollup.totalMarksMastered,
          total_marks_pool: scope.rollup.totalMarksPool,
          max_score_scale: scope.maxScore,
          subject_summaries: subjectSummaries,
        };
      });
    }

    return ctx;
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
    isMultiExam,
    examScopes,
  ]);

  return { buildContextSnapshot, examScopes, isMultiExam };
}
