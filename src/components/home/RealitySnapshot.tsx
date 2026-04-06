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
      return "border-emerald-500/30 bg-emerald-950/25 text-emerald-50 shadow-[0_0_40px_-12px_rgba(16,185,129,0.35)]";
    case "strong":
      return "border-teal-500/25 bg-teal-950/20 text-teal-50";
    case "mediocre":
      return "border-amber-500/30 bg-amber-950/20 text-amber-50";
    case "danger":
      return "border-rose-500/35 bg-rose-950/25 text-rose-50";
    case "no_plan":
      return "border-slate-600/80 bg-slate-950/80 text-slate-200";
  }
}

export function RealitySnapshot({
  marksMastered,
  marksTotal,
  syllabusMasteryPercent,
  syllabusMultiYear,
  todayPercent,
  todayTaskCount,
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
      className="overflow-hidden rounded-2xl border border-white/[0.07] bg-slate-900/35 shadow-2xl shadow-black/50 backdrop-blur-md sm:rounded-3xl"
    >
      <ExamCountdownHero />

      <div className="border-t border-white/[0.06] px-3 py-5 sm:px-6 sm:py-7 md:py-8 lg:px-8 lg:py-9">
        <div className="flex flex-col gap-0.5 text-center sm:gap-1 sm:text-left">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-emerald-400/85 sm:text-[0.65rem] sm:tracking-[0.28em]">
            Reality snapshot
          </p>
          <p className="text-xs leading-snug text-slate-500 sm:text-sm sm:leading-normal">
            Where your syllabus stands and how hard you&apos;re executing today.
            {useCuet ? (
              <span className="mt-1 block text-[11px] text-slate-600">
                CUET model:{" "}
                <span className="font-medium text-slate-500">
                  200 marks per domain
                </span>
                {showAdvancedMarksProjection
                  ? " · projected from microtopic completion"
                  : " · completion % only (advanced projection off)"}
              </span>
            ) : primaryMarksYear != null &&
              examLabel &&
              showAdvancedMarksProjection ? (
              <span className="mt-1 block text-[11px] text-slate-600">
                Primary chapter weights:{" "}
                <span className="font-medium text-slate-500">
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
            "mt-5 rounded-xl border border-white/[0.06] bg-slate-950/45 p-3.5 shadow-inner shadow-black/20 sm:mt-8 sm:rounded-2xl sm:p-5 md:p-6 lg:p-8",
            (useSyllabusYears || useCuet) && "lg:py-10",
          )}
        >
          {showSyllabusComingSoonBanner && (examFriendly || examLabel) ? (
            <div className="mb-5 flex gap-3 rounded-xl border border-emerald-500/25 bg-emerald-950/25 px-3 py-3 sm:px-4 sm:py-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15">
                <Sparkles className="h-5 w-5 text-emerald-300" aria-hidden />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-400/95">
                  {examFriendly || examLabel} syllabus
                </p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  No syllabus catalog for this exam yet — the ring below uses
                  plan-linked marks until we ship chapter weights for{" "}
                  {examFriendly || examLabel}.
                </p>
              </div>
            </div>
          ) : null}

          {useCuet && cuetScoring ? (
            <div className="grid grid-cols-1 items-center gap-6 sm:gap-8 lg:grid-cols-12 lg:gap-6 lg:gap-y-8 xl:gap-10">
              <div className="flex flex-col items-center text-center lg:col-span-3 lg:items-start lg:text-left">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:text-[10px] sm:tracking-[0.22em]">
                  Overall CUET progress
                </p>
                <p className="mt-1.5 text-4xl font-bold tabular-nums tracking-tight text-white sm:mt-2 sm:text-5xl md:text-6xl">
                  {cuetScoring.overallPercent % 1 === 0
                    ? cuetScoring.overallPercent.toFixed(0)
                    : cuetScoring.overallPercent.toFixed(1)}
                  %
                </p>
                <p className="mt-1.5 max-w-[13rem] text-[11px] leading-relaxed text-slate-500 sm:mt-2 sm:text-xs">
                  Combined across your selected domain subjects (each capped at
                  200).
                </p>
              </div>

              <div className="flex justify-center lg:col-span-5">
                <div className="origin-center scale-[0.72] sm:scale-90 md:scale-100">
                  <CircularProgressRing
                    percent={marksPct}
                    gradientId={gidMarks}
                    size={192}
                    strokeWidth={11}
                    className="mx-auto"
                  >
                    <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-[10px] sm:tracking-[0.2em]">
                      {showAdvancedMarksProjection
                        ? "Projected CUET score"
                        : "CUET syllabus"}
                    </span>
                    {showAdvancedMarksProjection ? (
                      <>
                        <p className="mt-1.5 flex items-baseline justify-center gap-1 text-2xl font-bold tabular-nums sm:mt-2 sm:gap-1.5 sm:text-3xl md:text-4xl">
                          <span className="text-emerald-300">
                            {cuetScoring.totalProjected}
                          </span>
                          <span className="text-lg font-semibold text-slate-600 sm:text-xl">
                            /
                          </span>
                          <span className="text-slate-200">
                            {cuetScoring.totalMax}
                          </span>
                        </p>
                        <p className="mt-2 max-w-[12rem] text-[10px] leading-snug text-slate-500 sm:mt-3 sm:text-[11px]">
                          Sum of domain projections (200 × subjects)
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="mt-1.5 text-3xl font-bold tabular-nums text-white sm:mt-2 sm:text-4xl md:text-5xl">
                          {cuetScoring.overallPercent % 1 === 0
                            ? cuetScoring.overallPercent.toFixed(0)
                            : cuetScoring.overallPercent.toFixed(1)}
                          <span className="align-super text-lg font-semibold text-emerald-400/90 sm:text-xl">
                            %
                          </span>
                        </p>
                        <p className="mt-2 max-w-[12rem] text-[10px] leading-snug text-slate-500 sm:mt-3 sm:text-[11px]">
                          Microtopic completion across domains
                        </p>
                      </>
                    )}
                  </CircularProgressRing>
                </div>
              </div>

              <div className="lg:col-span-4">
                <p className="mb-3 text-center text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:mb-4 sm:text-[10px] sm:tracking-[0.2em] lg:text-left">
                  Per domain subject
                </p>
                <ul
                  className="mx-auto flex max-w-sm flex-col gap-2.5 border-t border-white/[0.06] pt-4 sm:gap-3 sm:pt-5 lg:mx-0 lg:max-w-none lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
                  aria-label={
                    showAdvancedMarksProjection
                      ? "CUET projected marks by subject"
                      : "CUET syllabus completion by subject"
                  }
                >
                  {cuetScoring.subjects.map((s) => (
                    <li
                      key={s.subject}
                      className="rounded-lg border border-white/[0.06] bg-slate-900/40 px-3 py-2.5 text-left"
                    >
                      <p className="text-[11px] font-semibold text-emerald-100/95">
                        {s.subject}
                      </p>
                      <p className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm tabular-nums">
                        <span className="text-zinc-400">
                          {s.completionPercent % 1 === 0
                            ? s.completionPercent.toFixed(0)
                            : s.completionPercent.toFixed(1)}
                          % syllabus
                        </span>
                        {showAdvancedMarksProjection ? (
                          <span className="text-emerald-300">
                            → {s.projectedMarks}/{s.maxPerSubject}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-600">
                        {s.completedMicrotopics}/{s.totalMicrotopics} microtopics
                        done
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : useSyllabusYears && syllabusMultiYear ? (
            <div className="grid grid-cols-1 items-center gap-6 sm:gap-8 lg:grid-cols-12 lg:gap-6 lg:gap-y-8 xl:gap-10">
              {/* Left: syllabus mastery % */}
              <div className="flex flex-col items-center text-center lg:col-span-3 lg:items-start lg:text-left">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:text-[10px] sm:tracking-[0.22em]">
                  Syllabus mastery
                </p>
                {masteryDisplay != null ? (
                  <>
                    <p className="mt-1.5 text-4xl font-bold tabular-nums tracking-tight text-white sm:mt-2 sm:text-5xl md:text-6xl">
                      {masteryDisplay}
                    </p>
                    <p className="mt-1.5 max-w-[13rem] text-[11px] leading-relaxed text-slate-500 sm:mt-2 sm:text-xs">
                      Full chapter credit when every microtopic in that chapter
                      is complete.
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">—</p>
                )}
              </div>

              {/* Center: primary ring */}
              <div className="flex justify-center lg:col-span-5">
                <div className="origin-center scale-[0.72] sm:scale-90 md:scale-100">
                  <CircularProgressRing
                    percent={marksPct}
                    gradientId={gidMarks}
                    size={192}
                    strokeWidth={11}
                    className="mx-auto"
                  >
                    <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-[10px] sm:tracking-[0.2em]">
                      Syllabus capture
                    </span>
                    <p className="mt-1.5 flex items-baseline justify-center gap-1 text-2xl font-bold tabular-nums sm:mt-2 sm:gap-1.5 sm:text-3xl md:text-4xl">
                      <span className="text-emerald-300">
                        {syllabusMultiYear.ringProjected}
                      </span>
                      <span className="text-lg font-semibold text-slate-600 sm:text-xl">
                        /
                      </span>
                      <span className="text-slate-200">
                        {syllabusMultiYear.ringOutOf}
                      </span>
                    </p>
                    <p className="mt-2 max-w-[11rem] text-[10px] leading-snug text-slate-500 sm:mt-3 sm:text-[11px]">
                      Main ring: marks_{syllabusMultiYear.ringYear} · out of{" "}
                      {syllabusMultiYear.ringOutOf}
                    </p>
                  </CircularProgressRing>
                </div>
              </div>

              {/* Right: all exam years */}
              <div className="lg:col-span-4">
                <p className="mb-3 text-center text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:mb-4 sm:text-[10px] sm:tracking-[0.2em] lg:text-left">
                  Multi-year breakdown (marks columns)
                </p>
                <ul
                  className="mx-auto flex max-w-sm flex-col gap-3 border-t border-white/[0.06] pt-4 sm:gap-5 sm:pt-5 lg:mx-0 lg:max-w-none lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"
                  aria-label="Marks secured by exam year"
                >
                  {syllabusMultiYear.lines.map((line) => (
                    <li key={line.year} className="text-left">
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 sm:text-[11px] sm:tracking-[0.12em]">
                        {examFriendly || examLabel || "Exam"} {line.year}
                      </p>
                      <p className="mt-1 flex items-baseline gap-1.5 text-xl font-bold tabular-nums sm:mt-1.5 sm:gap-2 sm:text-2xl md:text-[1.65rem]">
                        <span className="text-emerald-300">
                          {line.projectedOutOf720}
                        </span>
                        <span className="text-sm font-semibold text-slate-500 sm:text-base">
                          / {syllabusMultiYear.ringOutOf}
                        </span>
                      </p>
                      <p className="mt-0.5 text-[10px] leading-snug text-slate-500 sm:mt-1 sm:text-[11px]">
                        {line.patternShort}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:justify-center sm:gap-8 md:gap-12">
              {masteryDisplay != null && (
                <div className="w-full max-w-[11rem] text-center sm:text-left">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:text-[10px] sm:tracking-[0.22em]">
                    Syllabus mastery
                  </p>
                  <p className="mt-1.5 text-4xl font-bold tabular-nums text-white sm:mt-2 sm:text-5xl">
                    {masteryDisplay}
                  </p>
                </div>
              )}
              <div className="flex flex-col items-center">
                <div className="origin-center scale-[0.78] sm:scale-95 md:scale-100">
                  <CircularProgressRing
                    percent={marksPct}
                    gradientId={gidMarks}
                    size={184}
                    strokeWidth={11}
                  >
                    <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-[10px] sm:tracking-[0.2em]">
                      {syllabusMasteryPercent != null && !showAdvancedMarksProjection
                        ? "Syllabus completion"
                        : "Syllabus capture"}
                    </span>
                    {syllabusMasteryPercent != null && !showAdvancedMarksProjection ? (
                      <p className="mt-1.5 text-3xl font-bold tabular-nums text-white sm:mt-2 sm:text-4xl md:text-5xl">
                        {masteryDisplay}
                      </p>
                    ) : (
                      <>
                        <p className="mt-1.5 flex items-baseline justify-center gap-1.5 text-2xl font-bold tabular-nums sm:mt-2 sm:text-3xl md:text-4xl">
                          <span className="text-emerald-300">
                            {marksMastered.toFixed(0)}
                          </span>
                          <span className="text-lg font-semibold text-slate-600 sm:text-xl">
                            /
                          </span>
                          <span className="text-slate-200">
                            {marksTotal.toFixed(0)}
                          </span>
                        </p>
                        <p className="mt-2 text-[10px] text-slate-500 sm:mt-3 sm:text-[11px]">
                          Marks secured vs your plan scope
                        </p>
                      </>
                    )}
                  </CircularProgressRing>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Master today */}
        <div className="mt-6 flex justify-center border-t border-white/[0.06] pt-6 sm:mt-10 sm:pt-10">
          <div className="origin-center scale-[0.82] sm:scale-95 md:scale-100">
            <CircularProgressRing
              percent={clampedToday}
              gradientId={gidToday}
              size={168}
              strokeWidth={10}
            >
              <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-[10px] sm:tracking-[0.2em]">
                Master today
              </span>
              <p className="mt-0.5 text-3xl font-bold tabular-nums text-white sm:mt-1 sm:text-4xl md:text-5xl">
                {clampedToday}
                <span className="align-super text-lg font-semibold text-emerald-400/90 sm:text-xl">
                  %
                </span>
              </p>
              <p className="mt-1.5 max-w-[12rem] text-center text-[9px] leading-snug text-slate-500 sm:mt-2 sm:text-[10px]">
                {todayTaskCount > 0
                  ? `${todayTaskCount} target${todayTaskCount === 1 ? "" : "s"} locked for today`
                  : "No targets yet — lock them in Plan"}
              </p>
            </CircularProgressRing>
          </div>
        </div>

        <div
          className={clsx(
            "mt-5 rounded-xl border px-3 py-3 text-left transition-colors duration-200 sm:mt-8 sm:rounded-2xl sm:px-4 sm:py-4 md:px-5",
            bandTone(dailyBand),
          )}
        >
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/70 sm:text-[10px] sm:tracking-[0.25em]">
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
