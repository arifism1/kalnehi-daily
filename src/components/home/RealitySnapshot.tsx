"use client";

import clsx from "clsx";
import { Sparkles } from "lucide-react";
import { useId } from "react";

import { examDisplayLabel } from "@/lib/examProfile";
import {
  type DailyProgressBand,
  DAILY_PROGRESS_HEADLINE,
  DAILY_PROGRESS_PILL,
} from "@/lib/progressEngine";
import type {
  CuetScoringRollup,
  SyllabusMultiYearCapture,
  SyllabusYearMarkLine,
} from "@/lib/syllabusRollup";

import { CircularProgressRing } from "@/components/ui/CircularProgressRing";
import { ExamCountdownHero } from "./ExamCountdownHero";

export type { SyllabusMultiYearCapture, SyllabusYearMarkLine };

export type RealitySnapshotProps = {
  /** Task-only / fallback when no multi-year syllabus data */
  marksMastered: number;
  marksTotal: number;
  /** Chapter-weight mastery % when syllabus is loaded; null if plan-only. */
  syllabusMasteryPercent: number | null;
  syllabusMultiYear: SyllabusMultiYearCapture | null;
  todayPercent: number;
  todayTaskCount: number;
  /** Done count from daily_tasks; null when falling back to academic tasks. */
  todayDoneCount?: number | null;
  dailyBand: DailyProgressBand;
  /** Profile exam has no syllabus catalog yet (e.g. JEE Main). */
  showSyllabusComingSoonBanner?: boolean;
  /** @deprecated Prefer `examDisplayName`; kept for older call sites. */
  primaryExamLabel?: string | null;
  /** `exams.display_name` for user-facing copy. */
  examDisplayName?: string | null;
  /** Stored `exams.exam_name` / profile `target_exam`. */
  examLabel?: string | null;
  /** Which marks_20xx column drives the main ring (e.g. 2025). */
  primaryMarksYear?: number | null;
  /** CUET: microtopic completion × 200 per domain + totals. */
  cuetScoring?: CuetScoringRollup | null;
  /** When false, ring and copy show completion % only (no projected mark numerators). */
  showAdvancedMarksProjection?: boolean;
};

function bandTone(b: DailyProgressBand): string {
  switch (b) {
    case "flawless":
      return "border-kal-accent/30 bg-kal-accent-soft/90 text-kal-accent-dark shadow-sm backdrop-blur-md dark:border-kal-accent/35 dark:bg-kal-accent/10 dark:text-kal-accent dark:shadow-[0_0_40px_-12px_rgba(255,122,0,0.35)]";
    case "strong":
      return "border-kal-accent/25 bg-kal-accent-soft/70 text-kal-accent-dark backdrop-blur-md dark:border-kal-accent/25 dark:bg-kal-accent/8 dark:text-kal-accent";
    case "mediocre":
      return "border-amber-200/80 bg-amber-50/85 text-amber-900 backdrop-blur-md dark:border-amber-500/35 dark:bg-amber-950/35 dark:text-amber-50";
    case "danger":
      return "border-amber-300/80 bg-amber-50/85 text-amber-900 backdrop-blur-md dark:border-amber-500/40 dark:bg-amber-950/38 dark:text-amber-100";
    case "no_plan":
      return "kal-glass-card border-kal-border/50 text-kal-text shadow-sm";
  }
}

export function RealitySnapshot({
  marksMastered,
  marksTotal,
  syllabusMasteryPercent,
  syllabusMultiYear,
  todayPercent,
  todayTaskCount,
  todayDoneCount = null,
  dailyBand,
  showSyllabusComingSoonBanner = false,
  primaryExamLabel = null,
  examDisplayName = null,
  examLabel = null,
  primaryMarksYear = null,
  cuetScoring = null,
  showAdvancedMarksProjection = true,
}: RealitySnapshotProps) {
  const idMarks = useId();
  const idToday = useId();
  const examFriendly =
    examDisplayName?.trim() ||
    examDisplayLabel(examLabel) ||
    primaryExamLabel?.trim() ||
    "";
  const clampedToday = Math.min(100, Math.max(0, Math.round(todayPercent)));
  const headline = DAILY_PROGRESS_HEADLINE[dailyBand];
  const pill = DAILY_PROGRESS_PILL[dailyBand];

  const useCuet =
    cuetScoring != null &&
    cuetScoring.subjects.length > 0 &&
    cuetScoring.totalMax > 0;
  const useSyllabusYears =
    !useCuet &&
    syllabusMultiYear != null &&
    syllabusMultiYear.lines.length > 0;
  const marksPct = useCuet
    ? Math.min(100, Math.max(0, cuetScoring.overallPercent))
    : useSyllabusYears
      ? Math.min(100, Math.max(0, syllabusMultiYear.ringPercent))
      : syllabusMasteryPercent != null && !showAdvancedMarksProjection
        ? Math.min(100, Math.max(0, syllabusMasteryPercent))
        : marksTotal > 0
          ? Math.round((marksMastered / marksTotal) * 1000) / 10
          : 0;

  const gidMarks = `km-${idMarks.replace(/:/g, "")}`;
  const gidToday = `kt-${idToday.replace(/:/g, "")}`;

  const masteryDisplay =
    syllabusMasteryPercent != null
      ? `${syllabusMasteryPercent % 1 === 0 ? syllabusMasteryPercent.toFixed(0) : syllabusMasteryPercent.toFixed(1)}%`
      : null;

  return (
    <section
      aria-label="Reality snapshot"
      className="kal-glass-panel rounded-2xl sm:rounded-2xl"
    >
      <ExamCountdownHero />

      <div className="border-t border-kal-border px-6 py-8 sm:px-10 sm:py-10 md:py-11 lg:px-12">
        <div className="flex max-w-3xl flex-col gap-1.5 text-center sm:text-left">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-kal-accent sm:text-[0.7rem] sm:tracking-[0.26em]">
            Reality snapshot
          </p>
          <p className="text-sm leading-relaxed text-kal-muted sm:text-[15px] sm:leading-[1.55]">
            Where your syllabus stands and how hard you&apos;re executing today.
            {useCuet ? (
              <span className="mt-1 block text-[11px] text-kal-text-secondary">
                CUET model:{" "}
                <span className="font-medium text-kal-muted">
                  200 marks per domain
                </span>
                {showAdvancedMarksProjection
                  ? " · projected from microtopic completion"
                  : " · completion % only (advanced projection off)"}
              </span>
            ) : primaryMarksYear != null &&
              examLabel &&
              showAdvancedMarksProjection ? (
              <span className="mt-1 block text-[11px] text-kal-text-secondary">
                Primary chapter weights:{" "}
                <span className="font-medium text-kal-muted">
                  marks_{primaryMarksYear}
                </span>{" "}
                ({examFriendly || examLabel})
              </span>
            ) : null}
          </p>
        </div>

        {/* Syllabus block: mastery (left) · ring (center) · per-year marks (right) */}
        <div
          className={clsx(
            "kal-glass-subtle mt-8 rounded-2xl p-7 sm:mt-10 sm:p-9 lg:p-11",
            (useSyllabusYears || useCuet) && "lg:py-12",
          )}
        >
          {showSyllabusComingSoonBanner && (examFriendly || examLabel) ? (
            <div className="mb-5 flex gap-3 rounded-xl border border-kal-accent/30 bg-kal-accent-soft/90 px-4 py-3.5 shadow-sm backdrop-blur-sm sm:px-5 dark:bg-kal-accent-soft/50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-kal-accent/15">
                <Sparkles className="h-5 w-5 text-kal-accent" aria-hidden />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-kal-accent">
                  {examFriendly || examLabel} syllabus
                </p>
                <p className="mt-1 text-xs leading-relaxed text-kal-muted">
                  No syllabus catalog for this exam yet — the ring below uses
                  plan-linked marks until we ship chapter weights for{" "}
                  {examFriendly || examLabel}.
                </p>
              </div>
            </div>
          ) : null}

          {useCuet && cuetScoring ? (
            <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] lg:gap-x-8 xl:gap-x-12">
              <div className="flex min-w-0 flex-col items-center text-center lg:items-start lg:text-left">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-kal-muted sm:text-[11px]">
                  Overall CUET progress
                </p>
                <p className="mt-3 text-4xl font-bold tabular-nums tracking-tight text-kal-text sm:text-5xl md:text-[3.25rem]">
                  {cuetScoring.overallPercent % 1 === 0
                    ? cuetScoring.overallPercent.toFixed(0)
                    : cuetScoring.overallPercent.toFixed(1)}
                  %
                </p>
                <p className="mt-3 max-w-[15rem] text-xs leading-relaxed text-kal-muted sm:max-w-[17rem]">
                  Combined across your selected domain subjects (each capped at
                  200).
                </p>
              </div>

              <div className="flex min-w-0 flex-col items-center gap-4 lg:gap-5">
                <div className="space-y-1 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-kal-muted sm:text-[11px]">
                    {showAdvancedMarksProjection
                      ? "Projected CUET score"
                      : "CUET completion"}
                  </p>
                  {showAdvancedMarksProjection ? (
                    <p className="text-xs text-kal-text-secondary">
                      Sum of domain projections (200 × subjects)
                    </p>
                  ) : (
                    <p className="text-xs text-kal-text-secondary">
                      Microtopic completion across domains
                    </p>
                  )}
                </div>
                <CircularProgressRing
                  percent={marksPct}
                  gradientId={gidMarks}
                  size={204}
                  strokeWidth={11}
                  className="mx-auto"
                >
                  {showAdvancedMarksProjection ? (
                    <div className="flex flex-col items-center gap-2">
                      <p className="inline-flex shrink-0 flex-nowrap items-baseline justify-center gap-1.5 whitespace-nowrap text-3xl font-bold tabular-nums sm:text-[2.125rem] md:text-4xl">
                        <span className="text-kal-accent dark:text-kal-accent/90">
                          {cuetScoring.totalProjected}
                        </span>
                        <span className="text-lg font-semibold text-kal-text-secondary sm:text-xl">
                          /
                        </span>
                        <span className="text-kal-text-secondary">
                          {cuetScoring.totalMax}
                        </span>
                      </p>
                      <p className="text-[11px] font-medium tabular-nums text-kal-muted">
                        {marksPct % 1 === 0
                          ? marksPct.toFixed(0)
                          : marksPct.toFixed(1)}
                        % of max
                      </p>
                    </div>
                  ) : (
                    <p className="text-4xl font-bold tabular-nums text-kal-text sm:text-[2.75rem] md:text-5xl">
                      {cuetScoring.overallPercent % 1 === 0
                        ? cuetScoring.overallPercent.toFixed(0)
                        : cuetScoring.overallPercent.toFixed(1)}
                      <span className="align-super text-lg font-semibold text-kal-accent dark:text-kal-accent/90 sm:text-xl">
                        %
                      </span>
                    </p>
                  )}
                </CircularProgressRing>
              </div>

              <div className="min-w-0 lg:flex lg:flex-col lg:border-l lg:border-kal-border lg:pl-8 xl:pl-10">
                <p className="mb-4 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-kal-muted sm:mb-5 sm:text-[11px] lg:text-left">
                  Per domain subject
                </p>
                <ul
                  className="mx-auto flex max-w-md flex-1 flex-col gap-3 border-t border-kal-border pt-5 sm:gap-3.5 sm:pt-6 lg:mx-0 lg:max-w-none lg:border-t-0 lg:pt-0"
                  aria-label={
                    showAdvancedMarksProjection
                      ? "CUET projected marks by subject"
                      : "CUET syllabus completion by subject"
                  }
                >
                  {cuetScoring.subjects.map((s) => (
                    <li
                      key={s.subject}
                      className="kal-glass-subtle rounded-lg px-3 py-2.5 text-left"
                    >
                      <p className="text-[11px] font-semibold text-kal-accent-dark dark:text-kal-accent/95">
                        {s.subject}
                      </p>
                      <p className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm tabular-nums">
                        <span className="text-kal-muted">
                          {s.completionPercent % 1 === 0
                            ? s.completionPercent.toFixed(0)
                            : s.completionPercent.toFixed(1)}
                          % syllabus
                        </span>
                        {showAdvancedMarksProjection ? (
                          <span className="text-kal-accent dark:text-kal-accent/90">
                            → {s.projectedMarks}/{s.maxPerSubject}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-[10px] text-kal-text-secondary">
                        {s.completedMicrotopics}/{s.totalMicrotopics} microtopics
                        done
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : useSyllabusYears && syllabusMultiYear ? (
            <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] lg:gap-x-8 xl:gap-x-12">
              {/* Left: syllabus mastery % */}
              <div className="flex min-w-0 flex-col items-center text-center lg:items-start lg:text-left">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-kal-muted sm:text-[11px]">
                  Syllabus mastery
                </p>
                {masteryDisplay != null ? (
                  <>
                    <p className="mt-3 text-4xl font-bold tabular-nums tracking-tight text-kal-text sm:text-5xl md:text-[3.25rem]">
                      {masteryDisplay}
                    </p>
                    <p className="mt-3 max-w-[15rem] text-xs leading-relaxed text-kal-muted sm:max-w-[17rem]">
                      Full chapter credit when every microtopic in that chapter
                      is complete.
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-kal-muted">—</p>
                )}
              </div>

              {/* Center: primary ring — title + caption outside the circle so nothing clips */}
              <div className="flex min-w-0 flex-col items-center gap-4 lg:gap-5">
                <div className="space-y-1 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-kal-muted sm:text-[11px]">
                    Primary marks ring
                  </p>
                  {showAdvancedMarksProjection ? (
                    <p className="text-xs text-kal-text-secondary">
                      Weights:{" "}
                      <span className="font-medium text-kal-muted">
                        marks_{syllabusMultiYear.ringYear}
                      </span>
                      <span className="text-kal-muted">
                        {" "}
                        · full scale {syllabusMultiYear.ringOutOf}
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-kal-text-secondary">
                      Completion % from your syllabus progress
                    </p>
                  )}
                </div>
                <CircularProgressRing
                  percent={marksPct}
                  gradientId={gidMarks}
                  size={204}
                  strokeWidth={11}
                  className="mx-auto"
                >
                  {showAdvancedMarksProjection ? (
                    <div className="flex flex-col items-center gap-2">
                      <p className="inline-flex shrink-0 flex-nowrap items-baseline justify-center gap-1.5 whitespace-nowrap text-3xl font-bold tabular-nums sm:text-[2.125rem] md:text-4xl">
                        <span className="text-kal-accent dark:text-kal-accent/90">
                          {syllabusMultiYear.ringProjected}
                        </span>
                        <span className="text-lg font-semibold text-kal-text-secondary sm:text-xl">
                          /
                        </span>
                        <span className="text-kal-text-secondary">
                          {syllabusMultiYear.ringOutOf}
                        </span>
                      </p>
                      <p className="text-[11px] font-medium tabular-nums text-kal-muted">
                        {marksPct % 1 === 0
                          ? marksPct.toFixed(0)
                          : marksPct.toFixed(1)}
                        % of scale
                      </p>
                    </div>
                  ) : (
                    <p className="text-4xl font-bold tabular-nums text-kal-text sm:text-[2.75rem] md:text-5xl">
                      {marksPct % 1 === 0
                        ? marksPct.toFixed(0)
                        : marksPct.toFixed(1)}
                      <span className="align-super text-lg font-semibold text-kal-accent dark:text-kal-accent/90 sm:text-xl">
                        %
                      </span>
                    </p>
                  )}
                </CircularProgressRing>
              </div>

              {/* Right: all exam years — border spans full column height */}
              <div className="min-w-0 lg:flex lg:flex-col lg:border-l lg:border-kal-border lg:pl-8 xl:pl-10">
                <p className="mb-4 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-kal-muted sm:mb-5 sm:text-[11px] lg:text-left">
                  Multi-year breakdown
                </p>
                <p className="mb-3 hidden text-xs text-kal-text-secondary lg:mb-4 lg:block">
                  Marks columns (720-scale projection per pattern year)
                </p>
                <div className="mx-auto w-full max-w-md flex-1 border-t border-kal-border pt-5 sm:pt-6 lg:mx-0 lg:max-w-none lg:border-t-0 lg:pt-0">
                    <ul
                      className="kal-glass-subtle divide-y divide-kal-border/50 rounded-xl border-kal-border/40 shadow-sm dark:divide-white/10"
                    aria-label="Marks secured by exam year"
                  >
                    {syllabusMultiYear.lines.map((line) => (
                      <li
                        key={line.year}
                        className="flex min-w-0 flex-col gap-2 px-3 py-3.5 text-left sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:px-4 sm:py-4"
                      >
                        <p className="min-w-0 shrink text-[11px] font-semibold uppercase tracking-[0.12em] text-kal-muted sm:max-w-[45%] sm:pt-0.5">
                          {examFriendly || examLabel || "Exam"} {line.year}
                        </p>
                        <div className="min-w-0 flex-1 sm:text-right">
                          <p className="inline-flex max-w-full flex-wrap items-baseline justify-end gap-x-1.5 gap-y-0.5 text-lg font-bold tabular-nums sm:justify-end sm:text-xl md:text-2xl">
                            <span className="text-kal-accent dark:text-kal-accent/90">
                              {line.projectedOutOf720}
                            </span>
                            <span className="text-sm font-semibold text-kal-muted sm:text-base">
                              / {syllabusMultiYear.ringOutOf}
                            </span>
                          </p>
                          <p className="mt-1 text-xs leading-snug text-kal-muted sm:mt-0.5">
                            {line.projectedOutOf720 === 0
                              ? "Start adding tasks to see your projected score."
                              : line.patternShort}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex w-full min-w-0 flex-col items-center gap-10 sm:flex-row sm:items-start sm:justify-center sm:gap-x-10 md:gap-x-14 lg:gap-x-16">
              {masteryDisplay != null && (
                <div className="flex w-full max-w-[14rem] flex-col items-center text-center sm:max-w-none sm:flex-1 sm:basis-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-kal-muted sm:text-[11px]">
                    Syllabus mastery
                  </p>
                  <p className="mt-3 text-4xl font-bold tabular-nums text-kal-text sm:text-5xl">
                    {masteryDisplay}
                  </p>
                </div>
              )}
              <div className="flex w-full max-w-[14rem] min-w-0 flex-col items-center gap-4 text-center sm:max-w-none sm:flex-1 sm:basis-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-kal-muted sm:text-[11px]">
                  {syllabusMasteryPercent != null && !showAdvancedMarksProjection
                    ? "Syllabus completion"
                    : "Plan-linked projection"}
                </p>
                <CircularProgressRing
                  percent={marksPct}
                  gradientId={gidMarks}
                  size={196}
                  strokeWidth={11}
                >
                  {syllabusMasteryPercent != null && !showAdvancedMarksProjection ? (
                    <p className="text-4xl font-bold tabular-nums text-kal-text sm:text-[2.75rem] md:text-5xl">
                      {masteryDisplay}
                    </p>
                  ) : marksMastered <= 0 ? (
                    <p className="max-w-[11rem] text-center text-xs leading-relaxed text-kal-muted">
                      Start adding tasks to see your progress projection.
                    </p>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <p className="inline-flex shrink-0 flex-nowrap items-baseline justify-center gap-1.5 whitespace-nowrap text-3xl font-bold tabular-nums sm:text-[2.125rem] md:text-4xl">
                        <span className="text-kal-accent dark:text-kal-accent/90">
                          {marksMastered.toFixed(0)}
                        </span>
                        <span className="text-lg font-semibold text-kal-text-secondary sm:text-xl">
                          /
                        </span>
                        <span className="text-kal-text-secondary">
                          {marksTotal.toFixed(0)}
                        </span>
                      </p>
                      <p className="text-[11px] text-kal-muted">
                        Marks secured vs plan scope
                      </p>
                    </div>
                  )}
                </CircularProgressRing>
              </div>
            </div>
          )}
        </div>

        {/* Master today */}
        <div className="mt-10 flex flex-col items-center gap-4 border-t border-kal-border pt-10 sm:mt-12 sm:pt-12">
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-kal-muted sm:text-[11px]">
            Master today
          </p>
          <CircularProgressRing
            percent={clampedToday}
            gradientId={gidToday}
            size={176}
            strokeWidth={10}
          >
            <p className="text-4xl font-bold tabular-nums text-kal-text sm:text-5xl md:text-[3.25rem]">
              {clampedToday}
              <span className="align-super text-lg font-semibold text-kal-accent dark:text-kal-accent/90 sm:text-xl">
                %
              </span>
            </p>
            <p className="mt-2 max-w-[13rem] text-center text-[11px] leading-relaxed text-kal-muted sm:text-xs">
              {todayTaskCount === 0
                ? "Add tasks to start"
                : todayDoneCount !== null
                  ? `${todayDoneCount} of ${todayTaskCount} done today`
                  : `${todayTaskCount} target${todayTaskCount === 1 ? "" : "s"} today`}
            </p>
          </CircularProgressRing>
        </div>

        <div
          className={clsx(
            "mt-8 rounded-2xl border px-4 py-4 text-left transition-colors duration-200 sm:mt-10 sm:px-5 sm:py-5 md:px-6",
            bandTone(dailyBand),
          )}
        >
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] opacity-75 sm:text-[10px] sm:tracking-[0.25em]">
            Execution signal · {pill}
          </p>
          <p className="mt-1.5 text-xs font-medium leading-snug sm:mt-2 sm:text-sm sm:leading-relaxed">
            {headline}
          </p>
        </div>
      </div>
    </section>
  );
}
