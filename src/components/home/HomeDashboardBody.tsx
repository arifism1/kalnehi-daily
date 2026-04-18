"use client";

import { addDays, format, parseISO } from "date-fns";
import { useEffect, useMemo, useRef } from "react";

import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useDailyPlanHomeExecution } from "@/hooks/useDailyPlanHomeExecution";
import { useSyllabusTracker } from "@/hooks/useSyllabusTracker";
import { useTargetExamDisplay } from "@/hooks/useTargetExamDisplay";
import { shouldShowSyllabusComingSoon } from "@/lib/examProfile";
import { buildSyllabusMultiYearCapture } from "@/lib/syllabusRollup";
import {
  isUpscCseMainsExam,
  UPSC_CSE_MAINS_UI_TOTAL_MARKS,
  upscMainsSyllabusUiPercent,
} from "@/lib/upscMainsOptionalSubjects";
import {
  classifyDailyProgressBand,
  computeWeightedCompletionPercent,
  computeWeightedMarksTotals,
  filterTasksForDate,
  filterTasksThroughDate,
} from "@/lib/progressEngine";
import { useAuthStore } from "@/store/useAuthStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useTaskStore } from "@/store/useTaskStore";

import { HomeAccordionSections } from "./HomeAccordionSections";
import { MotivationStrip } from "./MotivationStrip";
import { RealitySnapshot } from "./RealitySnapshot";
import { ThreeDayStrip } from "./ThreeDayStrip";

export function HomeDashboardBody() {
  const user = useAuthStore((s) => s.user);

  const {
    examLabel,
    examDisplayName,
    examLabelLoading,
  } = useTargetExamDisplay();
  const tasksRecord = useTaskStore((s) => s.tasks);
  const microtopicById = useTaskStore((s) => s.microtopics);
  const {
    rows: syllabusRows,
    rollup: syllabusRollup,
    neetYearProjections,
    primaryMarksYear,
    maxScore: syllabusScoreMax,
    catalogExamKey,
    cuetScoringRollup,
    cuetAwaitingDomainSelection,
    loading: syllabusLoading,
    error: syllabusError,
  } = useSyllabusTracker();

  const isUpscMainsUi = isUpscCseMainsExam(catalogExamKey);

  const advancedMarksProjectionEnabled = useSettingsStore(
    (s) => s.advancedMarksProjectionEnabled,
  );

  const showSyllabusComingSoonBanner = shouldShowSyllabusComingSoon({
    examLabel,
    examLabelLoading,
    syllabusLoading,
    syllabusError,
    syllabusRowCount: syllabusRows.length,
    cuetAwaitingDomainSelection,
  });

  const today = useCalendarDate();
  const yesterday = useMemo(
    () => format(addDays(parseISO(today), -1), "yyyy-MM-dd"),
    [today],
  );
  const taskList = useMemo(() => Object.values(tasksRecord), [tasksRecord]);

  const { realityTasks, todayTasks, yesterdayTasks } = useMemo(() => {
    const reality = filterTasksThroughDate(taskList, today);
    const todayOnly = filterTasksForDate(taskList, today);
    const yTasks = filterTasksForDate(taskList, yesterday);
    return {
      realityTasks: reality,
      todayTasks: todayOnly,
      yesterdayTasks: yTasks,
    };
  }, [taskList, today, yesterday]);

  const dailyExec = useDailyPlanHomeExecution();

  const {
    effectiveTodayPercent,
    effectiveTodayTotal,
    effectiveTodayDone,
    yesterdayStripPercent,
    todayStripPercent,
    todayWeighted,
  } = useMemo(() => {
    const todayAcademic = computeWeightedCompletionPercent(
      todayTasks,
      microtopicById,
    );
    const yesterdayAcademic = computeWeightedCompletionPercent(
      yesterdayTasks,
      microtopicById,
    );
    return {
      effectiveTodayPercent:
        dailyExec.today.totalCount > 0 ? dailyExec.today.percent : todayAcademic,
      effectiveTodayTotal:
        dailyExec.today.totalCount > 0 ? dailyExec.today.totalCount : todayTasks.length,
      effectiveTodayDone:
        dailyExec.today.totalCount > 0 ? dailyExec.today.doneCount : null,
      yesterdayStripPercent:
        dailyExec.yesterday.totalCount > 0
          ? dailyExec.yesterday.percent
          : yesterdayAcademic,
      todayStripPercent:
        dailyExec.today.totalCount > 0 ? dailyExec.today.percent : todayAcademic,
      todayWeighted: todayAcademic,
    };
  }, [
    dailyExec.today.totalCount,
    dailyExec.today.percent,
    dailyExec.today.doneCount,
    dailyExec.yesterday.totalCount,
    dailyExec.yesterday.percent,
    todayTasks,
    yesterdayTasks,
    microtopicById,
  ]);

  const dailyBand = useMemo(
    () => classifyDailyProgressBand(effectiveTodayPercent, effectiveTodayTotal),
    [effectiveTodayPercent, effectiveTodayTotal],
  );

  const lastDangerPushPingAt = useRef(0);

  useEffect(() => {
    if (!user?.id) return;
    const total =
      dailyExec.today.totalCount > 0
        ? dailyExec.today.totalCount
        : todayTasks.length;
    const pct =
      dailyExec.today.totalCount > 0
        ? dailyExec.today.percent
        : todayWeighted;
    if (total === 0 || pct >= 25) {
      return;
    }
    const now = Date.now();
    if (now - lastDangerPushPingAt.current < 6 * 60 * 1000) {
      return;
    }
    const t = window.setTimeout(() => {
      lastDangerPushPingAt.current = Date.now();
      void fetch("/api/push/danger-zone", {
        method: "POST",
        credentials: "include",
      }).catch(() => {});
    }, 10_000);
    return () => window.clearTimeout(t);
  }, [
    user?.id,
    dailyExec.today.totalCount,
    dailyExec.today.percent,
    todayWeighted,
    todayTasks.length,
  ]);

  const { mastered, total } = useMemo(() => {
    if (cuetScoringRollup) {
      return {
        mastered: cuetScoringRollup.totalProjected,
        total: cuetScoringRollup.totalMax,
      };
    }
    if (syllabusRows.length > 0) {
      return {
        mastered: syllabusRollup.totalMarksMastered,
        total: isUpscMainsUi
          ? UPSC_CSE_MAINS_UI_TOTAL_MARKS
          : syllabusRollup.totalMarksPool,
      };
    }
    return computeWeightedMarksTotals(realityTasks, microtopicById);
  }, [
    cuetScoringRollup,
    syllabusRows.length,
    syllabusRollup.totalMarksMastered,
    syllabusRollup.totalMarksPool,
    realityTasks,
    microtopicById,
    isUpscMainsUi,
  ]);

  const syllabusMasteryPercent = useMemo(() => {
    if (cuetScoringRollup) return cuetScoringRollup.overallPercent;
    if (syllabusRows.length > 0) {
      if (isUpscMainsUi) {
        return upscMainsSyllabusUiPercent(syllabusRollup.totalMarksMastered);
      }
      return syllabusRollup.overallPercent;
    }
    return null;
  }, [
    cuetScoringRollup,
    syllabusRows.length,
    syllabusRollup.overallPercent,
    syllabusRollup.totalMarksMastered,
    isUpscMainsUi,
  ]);

  const syllabusMultiYear = useMemo(() => {
    if (!advancedMarksProjectionEnabled) return null;
    if (syllabusRows.length === 0 || neetYearProjections.length === 0) {
      return null;
    }
    return buildSyllabusMultiYearCapture(
      neetYearProjections,
      syllabusScoreMax,
      primaryMarksYear,
      isUpscMainsUi ? UPSC_CSE_MAINS_UI_TOTAL_MARKS : undefined,
    );
  }, [
    advancedMarksProjectionEnabled,
    syllabusRows.length,
    neetYearProjections,
    syllabusScoreMax,
    primaryMarksYear,
    isUpscMainsUi,
  ]);

  return (
    <>
      <MotivationStrip />

      <RealitySnapshot
        marksMastered={mastered}
        marksTotal={total}
        syllabusMasteryPercent={syllabusMasteryPercent}
        syllabusMultiYear={syllabusMultiYear}
        todayPercent={effectiveTodayPercent}
        todayTaskCount={effectiveTodayTotal}
        todayDoneCount={effectiveTodayDone}
        dailyBand={dailyBand}
        showSyllabusComingSoonBanner={showSyllabusComingSoonBanner}
        examDisplayName={examDisplayName}
        examLabel={examLabel}
        primaryMarksYear={cuetScoringRollup ? null : primaryMarksYear}
        cuetScoring={cuetScoringRollup}
        showAdvancedMarksProjection={advancedMarksProjectionEnabled}
      />

      <ThreeDayStrip
        yesterdayPercent={yesterdayStripPercent}
        todayPercent={todayStripPercent}
        tomorrowTaskCount={dailyExec.tomorrow.taskCount}
        tomorrowMinutes={dailyExec.tomorrow.totalMinutes}
      />

      <HomeAccordionSections />
    </>
  );
}
