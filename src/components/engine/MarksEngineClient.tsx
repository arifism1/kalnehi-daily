"use client";

import { useMemo } from "react";

import { useCalendarDate } from "@/hooks/useCalendarDate";
import { usePrimaryExamLabel } from "@/hooks/usePrimaryExamLabel";
import { useRefreshTasksOnHomeFocus } from "@/hooks/useRefreshTasksOnHomeFocus";
import { useSyllabusTracker } from "@/hooks/useSyllabusTracker";
import { SyllabusComingSoon } from "@/components/syllabus/SyllabusComingSoon";
import { examHasPrevYearMarks, shouldShowSyllabusComingSoon } from "@/lib/examProfile";
import { buildMarksEngineSnapshot } from "@/lib/engine/marksEngineStats";
import {
  isUpscCseMainsExam,
  UPSC_CSE_MAINS_UI_TOTAL_MARKS,
} from "@/lib/upscMainsOptionalSubjects";
import { useTaskStore } from "@/store/useTaskStore";

import { EngineCard, EngineHero } from "./EngineHero";

export function MarksEngineClient() {
  useRefreshTasksOnHomeFocus();
  const { examLabel, loading: examLoading } = usePrimaryExamLabel();

  const today = useCalendarDate();
  const tasksRecord = useTaskStore((s) => s.tasks);
  const microRecord = useTaskStore((s) => s.microtopics);
  const {
    rows,
    rollup,
    neetYearProjections,
    catalogExamKey,
    cuetScoringRollup,
    cuetAwaitingDomainSelection,
    loading: syllabusLoading,
    error: syllabusError,
    maxScore,
  } = useSyllabusTracker();

  const hasPrevYearMarks = examHasPrevYearMarks(catalogExamKey ?? examLabel);

  const syllabusSoon = shouldShowSyllabusComingSoon({
    examLabel,
    examLabelLoading: examLoading,
    syllabusLoading,
    syllabusError,
    syllabusRowCount: rows.length,
    cuetAwaitingDomainSelection,
  });

  const snap = useMemo(() => {
    const tasks = Object.values(tasksRecord);
    const syllabusRollup = rows.length > 0 ? rollup : null;
    return buildMarksEngineSnapshot(
      today,
      tasks,
      microRecord,
      syllabusRollup,
      neetYearProjections,
      maxScore,
      cuetScoringRollup,
      isUpscCseMainsExam(catalogExamKey)
        ? UPSC_CSE_MAINS_UI_TOTAL_MARKS
        : null,
    );
  }, [
    today,
    tasksRecord,
    microRecord,
    rows.length,
    rollup,
    neetYearProjections,
    maxScore,
    cuetScoringRollup,
    catalogExamKey,
  ]);

  return (
    <div className="space-y-6">
      <EngineHero
        eyebrow="Strategic marks"
        title="Marks Engine"
        description="Chapter-weight mastery, multi-year projections, and plan-level marks at risk — built for rank-focused execution."
      />

      {syllabusSoon && examLabel ? (
        <SyllabusComingSoon variant="compact" examLabel={examLabel} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <EngineCard title="Syllabus · chapter pool">
          <p className="text-3xl font-bold tabular-nums text-kal-accent">
            {Math.round(snap.syllabusMastered)} /{" "}
            {Math.round(snap.syllabusPool)}
          </p>
          <p className="mt-2 text-sm text-kal-muted">
            {syllabusSoon
              ? `Chapter-weight pool for ${examLabel} is coming soon. Numbers stay on plan scope until your exam’s syllabus ships.`
              : cuetScoringRollup
                ? `CUET projection (${snap.syllabusPercent.toFixed(1)}% overall) — each domain is 200 marks from microtopic completion.`
                : `Weight captured (${snap.syllabusPercent.toFixed(1)}%) — full credit only when every microtopic in a chapter is done.`}
          </p>
        </EngineCard>

        <EngineCard title="Marks at risk (missed)">
          <p className="text-3xl font-bold tabular-nums text-kal-warn-text dark:text-amber-300">
            {Math.round(snap.marksAtRisk)}
          </p>
          <p className="mt-2 text-sm text-kal-muted">
            {snap.missedTaskCount} open past task
            {snap.missedTaskCount === 1 ? "" : "s"} — reallocate or crush them.
          </p>
        </EngineCard>

        <EngineCard title="Gained today (plan)">
          <p className="text-3xl font-bold tabular-nums text-kal-accent">
            +{Math.round(snap.gainedToday)}
          </p>
          <p className="mt-2 text-sm text-kal-muted">
            Weighted marks from tasks completed today.
          </p>
        </EngineCard>
      </div>

      <EngineCard title="Year projections · chapter weights">
        {!hasPrevYearMarks ? (
          <p className="text-sm text-kal-muted">
            Year-by-year projections are not available for this exam yet. Marks
            data is being verified and will be added soon.
          </p>
        ) : syllabusSoon ? (
          <p className="text-sm text-kal-muted">
            Year-by-year projections appear when your target exam has a syllabus
            catalog loaded.
          </p>
        ) : snap.neetByYear.length === 0 ? (
          <p className="text-sm text-kal-muted">
            Load syllabus weights (recent-year columns from the catalog) to unlock per-year
            projections (scaled to your exam&apos;s max score).
          </p>
        ) : (
          <ul className="space-y-3">
            {snap.neetByYear.map((y) => (
              <li
                key={y.year}
                className="flex items-baseline justify-between gap-3 rounded-xl border border-kal-border bg-kal-card-muted px-4 py-3"
              >
                <span className="text-sm font-semibold text-kal-text-secondary">
                  {examLabel ?? "Exam"} {y.year}
                </span>
                <span className="text-2xl font-bold tabular-nums text-kal-accent">
                  {y.mastered720}
                  <span className="text-base font-semibold text-kal-muted">
                    {" "}
                    / {y.scoreMax}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </EngineCard>

      <EngineCard title="Plan scope (all tasks)">
        <p className="text-lg text-kal-text-secondary">
          <span className="font-semibold text-kal-text tabular-nums">
            {Math.round(snap.taskMastered)}
          </span>{" "}
          mastered of{" "}
          <span className="tabular-nums">{Math.round(snap.taskTotalWeight)}</span>{" "}
          weighted load
        </p>
        <p className="mt-2 text-sm text-kal-muted">
          Remaining plan weight:{" "}
          <span className="font-medium text-kal-text-secondary tabular-nums">
            {Math.round(snap.remainingPlanWeight)}
          </span>
        </p>
      </EngineCard>
    </div>
  );
}
