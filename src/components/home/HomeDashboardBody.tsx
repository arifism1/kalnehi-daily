"use client";

import { addDays, format, parseISO } from "date-fns";
import { useEffect, useMemo, useRef } from "react";

import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useDailyPlanHomeExecution } from "@/hooks/useDailyPlanHomeExecution";
import { useExamsCatalogRows } from "@/hooks/useExamsCatalogRows";
import { useSyllabusTracker } from "@/hooks/useSyllabusTracker";
import { useTargetExamDate } from "@/hooks/useTargetExamDate";
import { useTargetExamDisplay } from "@/hooks/useTargetExamDisplay";
import { shouldShowSyllabusComingSoon } from "@/lib/examProfile";
import { displayNameForExamCatalog } from "@/lib/examsCatalog";
import {
  averageProjectedOutOfMax,
  buildSyllabusMultiYearCapture,
} from "@/lib/syllabusRollup";
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
import type { DailyMotivationalPhraseRow } from "@/lib/dailyMotivationalPhrase";

import { HomeFeatureGrid } from "./HomeFeatureGrid";
import { HomeHeroCard } from "./HomeHeroCard";
import { HomePriorityStrip } from "./HomePriorityStrip";
import { MotivationStrip } from "./MotivationStrip";
import { ThreeDayStrip } from "./ThreeDayStrip";

export type HomeDashboardBodyProps = {
  firstName: string;
  greetingLead: string;
  dailyPhrase: DailyMotivationalPhraseRow | null;
  dailyPhraseLoading: boolean;
};

export function HomeDashboardBody({
  firstName,
  greetingLead,
  dailyPhrase,
  dailyPhraseLoading,
}: HomeDashboardBodyProps) {
  const user = useAuthStore((s) => s.user);

  const {
    examLabel,
    examDisplayName,
    examLabelLoading,
  } = useTargetExamDisplay();
  const { examDates } = useTargetExamDate();
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
    examResults,
    examRollups,
  } = useSyllabusTracker();

  const { rows: catalogRows } = useExamsCatalogRows();

  const allExamsDisplayName = useMemo(() => {
    if (examResults.length > 1) {
      return examResults
        .map((er) => displayNameForExamCatalog(er.examLabel, catalogRows) || er.examLabel)
        .join(" · ");
    }
    return examDisplayName;
  }, [examResults, catalogRows, examDisplayName]);

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

  const { mastered, total, projectedScoreCaption } = useMemo(() => {
    if (cuetScoringRollup) {
      return {
        mastered: cuetScoringRollup.totalProjected,
        total: cuetScoringRollup.totalMax,
        projectedScoreCaption: null as string | null,
      };
    }
    if (syllabusRows.length > 0 && neetYearProjections.length > 0) {
      const avg = averageProjectedOutOfMax(neetYearProjections);
      if (avg != null) {
        return {
          mastered: avg,
          total: syllabusScoreMax,
          projectedScoreCaption: "Based on past few years' exam patterns",
        };
      }
    }
    if (syllabusRows.length > 0) {
      return {
        mastered: syllabusRollup.totalMarksMastered,
        total: isUpscMainsUi
          ? UPSC_CSE_MAINS_UI_TOTAL_MARKS
          : syllabusRollup.totalMarksPool,
        projectedScoreCaption: null as string | null,
      };
    }
    // While the syllabus fetch is still in flight, don't show task-based marks
    // (e.g. "3/66") — that metric is on a completely different scale and would
    // immediately be replaced by the real projected score, causing a jerk.
    // Return 0/0 so HomeHeroCard renders "—" as a stable placeholder.
    if (syllabusLoading) {
      return { mastered: 0, total: 0, projectedScoreCaption: null as string | null };
    }
    return {
      ...computeWeightedMarksTotals(realityTasks, microtopicById),
      projectedScoreCaption: null as string | null,
    };
  }, [
    cuetScoringRollup,
    syllabusRows.length,
    neetYearProjections,
    syllabusScoreMax,
    syllabusRollup.totalMarksMastered,
    syllabusRollup.totalMarksPool,
    syllabusLoading,
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

  // Kept for downstream use — not rendered on home page but preserves hook call
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

  // Suppress unused-variable lint: syllabusMultiYear and dailyBand are
  // retained for their hook side-effects / future use.
  void showSyllabusComingSoonBanner;
  void syllabusMultiYear;
  void dailyBand;
  void effectiveTodayDone;

  return (
    <>
      {/* Section A — Hero card */}
      <HomeHeroCard
        firstName={firstName}
        greetingLead={greetingLead}
        syllabusMasteryPercent={syllabusMasteryPercent}
        marksMastered={mastered}
        marksTotal={total}
        projectedScoreCaption={projectedScoreCaption}
        todayPercent={effectiveTodayPercent}
        todayTaskCount={effectiveTodayTotal}
        examDisplayName={allExamsDisplayName}
        examRollups={examRollups ?? undefined}
        examDates={examDates}
      />

      {/* Section B — Daily motivational line */}
      {!dailyPhraseLoading && dailyPhrase && (
        <p
          className="text-center font-serif text-[15px] font-normal italic leading-relaxed text-kal-muted"
          aria-label={`Today's line: ${dailyPhrase.phrase}`}
        >
          &ldquo;{dailyPhrase.phrase}&rdquo;
          {dailyPhrase.author && (
            <span className="mt-0.5 block font-sans text-xs not-italic text-kal-muted">
              — {dailyPhrase.author}
            </span>
          )}
        </p>
      )}

      {/* Section C — Purpose mode strip (conditional on purposeModeEnabled) */}
      <MotivationStrip />

      {/* Section D — Priority strip */}
      <HomePriorityStrip />

      {/* Section E — All 18 features grid */}
      <HomeFeatureGrid
        syllabusMasteryPercent={syllabusMasteryPercent}
        marksMastered={mastered}
        marksTotal={total}
        todayPercent={effectiveTodayPercent}
        todayTaskCount={effectiveTodayTotal}
      />

      {/* Section F — 3-day execution */}
      <ThreeDayStrip
        yesterdayPercent={yesterdayStripPercent}
        todayPercent={todayStripPercent}
        tomorrowTaskCount={dailyExec.tomorrow.taskCount}
        tomorrowMinutes={dailyExec.tomorrow.totalMinutes}
      />
    </>
  );
}
