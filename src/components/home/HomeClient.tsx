"use client";

import { addDays, format, parseISO } from "date-fns";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useTargetExamDisplay } from "@/hooks/useTargetExamDisplay";
import { useRefreshTasksOnHomeFocus } from "@/hooks/useRefreshTasksOnHomeFocus";
import { useSyllabusTracker } from "@/hooks/useSyllabusTracker";
import { buildSyllabusMultiYearCapture } from "@/lib/syllabusRollup";
import { shouldShowSyllabusComingSoon } from "@/lib/examProfile";
import {
  classifyDailyProgressBand,
  computeWeightedCompletionPercent,
  computeWeightedMarksTotals,
  filterTasksForDate,
  filterTasksThroughDate,
  sumEstimatedMinutes,
  sumPlannedMarksWeight,
} from "@/lib/progressEngine";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useTaskStore } from "@/store/useTaskStore";

import { ArenaToday } from "./ArenaToday";
import { ExecutionLagBanner } from "./ExecutionLagBanner";
import { MissedTasks } from "./MissedTasks";
import { MotivationStrip } from "./MotivationStrip";
import { RealitySnapshot } from "./RealitySnapshot";
import { ThreeDayStrip } from "./ThreeDayStrip";

export function HomeClient() {
  const router = useRouter();
  useRefreshTasksOnHomeFocus();
  useEffect(() => {
    router.prefetch("/syllabus");
  }, [router]);

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
    cuetScoringRollup,
    cuetAwaitingDomainSelection,
    loading: syllabusLoading,
    error: syllabusError,
  } = useSyllabusTracker();

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
  const tomorrow = useMemo(
    () => format(addDays(parseISO(today), 1), "yyyy-MM-dd"),
    [today],
  );

  const taskList = useMemo(() => Object.values(tasksRecord), [tasksRecord]);

  const { realityTasks, todayTasks, yesterdayTasks, tomorrowTasks } =
    useMemo(() => {
      const reality = filterTasksThroughDate(taskList, today);
      const todayOnly = filterTasksForDate(taskList, today);
      const yTasks = filterTasksForDate(taskList, yesterday);
      const tTasks = filterTasksForDate(taskList, tomorrow);
      return {
        realityTasks: reality,
        todayTasks: todayOnly,
        yesterdayTasks: yTasks,
        tomorrowTasks: tTasks,
      };
    }, [taskList, today, yesterday, tomorrow]);

  const todayWeighted = useMemo(
    () => computeWeightedCompletionPercent(todayTasks, microtopicById),
    [todayTasks, microtopicById],
  );

  const dailyBand = useMemo(
    () => classifyDailyProgressBand(todayWeighted, todayTasks.length),
    [todayWeighted, todayTasks.length],
  );

  const yesterdayWeighted = useMemo(
    () => computeWeightedCompletionPercent(yesterdayTasks, microtopicById),
    [yesterdayTasks, microtopicById],
  );

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
        total: syllabusRollup.totalMarksPool,
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
  ]);

  const syllabusMasteryPercent = useMemo(() => {
    if (cuetScoringRollup) return cuetScoringRollup.overallPercent;
    if (syllabusRows.length > 0) return syllabusRollup.overallPercent;
    return null;
  }, [
    cuetScoringRollup,
    syllabusRows.length,
    syllabusRollup.overallPercent,
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
    );
  }, [
    advancedMarksProjectionEnabled,
    syllabusRows.length,
    neetYearProjections,
    syllabusScoreMax,
    primaryMarksYear,
  ]);

  const tomorrowMarks = useMemo(
    () => sumPlannedMarksWeight(tomorrowTasks, microtopicById),
    [tomorrowTasks, microtopicById],
  );

  const tomorrowMinutes = useMemo(
    () => sumEstimatedMinutes(tomorrowTasks),
    [tomorrowTasks],
  );

  return (
    <div className="flex min-h-full flex-col gap-6 pb-10 text-kal-text sm:gap-8 md:gap-10 md:pb-14">
      <header className="relative overflow-hidden rounded-[1rem] border border-kal-border bg-kal-card px-5 py-8 kal-shadow-card sm:rounded-[1.25rem] sm:px-8 sm:py-10 lg:px-10">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-kal-accent/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-kal-accent/10 blur-3xl"
          aria-hidden
        />

        <p className="relative text-[0.6rem] font-semibold uppercase tracking-[0.28em] text-kal-accent sm:text-[0.65rem] sm:tracking-[0.35em]">
          Kalnehi Daily
        </p>
        <p className="relative mt-1 text-[9px] font-medium uppercase tracking-[0.22em] text-kal-muted sm:mt-1.5 sm:text-[10px] sm:tracking-[0.28em]">
          Master today · disciplined execution
        </p>
        <h1 className="relative mt-4 text-2xl font-bold tracking-tight text-kal-text sm:mt-6 sm:text-3xl sm:leading-tight md:text-[2.125rem] lg:text-[2.25rem]">
          Execute Today
        </h1>
        <p className="relative mt-2 max-w-md text-sm leading-relaxed text-kal-muted sm:mt-3 sm:text-[15px]">
          Conquer your syllabus and win daily — built for serious JEE &amp; NEET
          preparation.
        </p>
      </header>

      <MotivationStrip />

      <ExecutionLagBanner />

      <RealitySnapshot
        marksMastered={mastered}
        marksTotal={total}
        syllabusMasteryPercent={syllabusMasteryPercent}
        syllabusMultiYear={syllabusMultiYear}
        todayPercent={todayWeighted}
        todayTaskCount={todayTasks.length}
        dailyBand={dailyBand}
        showSyllabusComingSoonBanner={showSyllabusComingSoonBanner}
        examDisplayName={examDisplayName}
        examLabel={examLabel}
        primaryMarksYear={cuetScoringRollup ? null : primaryMarksYear}
        cuetScoring={cuetScoringRollup}
        showAdvancedMarksProjection={advancedMarksProjectionEnabled}
      />

      <ThreeDayStrip
        yesterdayPercent={yesterdayWeighted}
        todayPercent={todayWeighted}
        tomorrowMarks={tomorrowMarks}
        tomorrowMinutes={tomorrowMinutes}
      />

      <ArenaToday />

      <MissedTasks />
    </div>
  );
}
