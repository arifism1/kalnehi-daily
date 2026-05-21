"use client";

import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import { useMemo } from "react";

import { useExamsCatalogRows } from "@/hooks/useExamsCatalogRows";
import { useTargetExamDate } from "@/hooks/useTargetExamDate";
import { examHasPrevYearMarks } from "@/lib/examProfile";
import { displayNameForExamCatalog } from "@/lib/examsCatalog";
import { useCountUp } from "@/hooks/useCountUp";

type ExamRollupEntry = {
  examLabel: string | null;
  rollup: {
    overallPercent: number;
    totalMarksMastered: number;
    totalMarksPool: number;
  };
  projections: Array<{ projectedOutOf720: number; year: number }>;
  maxScore: number;
};

export type HomeHeroCardProps = {
  firstName: string;
  greetingLead: string;
  /** Syllabus coverage % (0–100), null when unavailable */
  syllabusMasteryPercent: number | null;
  /** Projected/mastered marks numerator */
  marksMastered: number;
  /** Projected/mastered marks denominator */
  marksTotal: number;
  /** Yesterday's plan completion 0–100 */
  yesterdayPercent: number;
  /** Tasks counted for yesterday (unified plan or legacy list length) */
  yesterdayTaskCount: number;
  /** Today's plan completion 0–100 */
  todayPercent: number;
  /** Number of tasks planned today */
  todayTaskCount: number;
  /** Human-readable exam name, e.g. "NEET UG" */
  examDisplayName?: string | null;
  /** Muted line under "Proj. score" when showing multi-year exam-scale average */
  projectedScoreCaption?: string | null;
  /** Per-exam rollups for multi-exam tracks; undefined/null = single-exam path */
  examRollups?: ExamRollupEntry[] | null;
  /** Per-exam dates map from useTargetExamDate */
  examDates?: Record<string, string>;
  /**
   * When false, the "Proj. score" middle cell is hidden entirely.
   * Defaults to true for backward compatibility.
   */
  showProjScore?: boolean;
  /**
   * When true, projected score and today/yesterday plan % show pulse placeholders.
   */
  loading?: boolean;
};

function computeDaysToExam(dateStr: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const today = startOfDay(new Date());
  const exam = startOfDay(parseISO(dateStr));
  const diff = differenceInCalendarDays(exam, today);
  return diff > 0 ? diff : null;
}

function StatCell({
  value,
  label,
  ariaLabel,
}: {
  value: string;
  label: string;
  ariaLabel: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-0.5 px-2 py-3 text-center">
      <span className="kal-home-stat-value" aria-label={ariaLabel}>
        {value}
      </span>
      <span className="text-[10px] leading-tight text-kal-muted">{label}</span>
    </div>
  );
}

function StatNumberSkeleton({ compact }: { compact?: boolean }) {
  return (
    <span
      className={
        compact
          ? "inline-block h-[1.1rem] w-14 animate-pulse rounded-md bg-black/10 dark:bg-white/15 sm:h-[1.25rem] sm:w-16"
          : "kal-home-stat-value inline-block h-[1.25rem] min-w-[3.75rem] animate-pulse rounded-md bg-black/10 dark:bg-white/15 sm:h-7 sm:min-w-[4.25rem]"
      }
      aria-hidden
    />
  );
}

export function HomeHeroCard({
  firstName,
  greetingLead,
  syllabusMasteryPercent,
  marksMastered,
  marksTotal,
  yesterdayPercent,
  yesterdayTaskCount,
  todayPercent,
  todayTaskCount,
  examDisplayName,
  projectedScoreCaption,
  examRollups,
  examDates,
  showProjScore = true,
  loading = false,
}: HomeHeroCardProps) {
  const { examDate } = useTargetExamDate();
  const { rows: catalogRows } = useExamsCatalogRows();

  const isMultiExam = examRollups != null && examRollups.length > 1;

  // For multi-exam: only show proj score rows for exams with verified mark weights
  const projScoreRollups = isMultiExam
    ? (examRollups ?? []).filter((er) => examHasPrevYearMarks(er.examLabel))
    : null;

  // Final flag: honour the prop, but also suppress if multi-exam has zero supported exams
  const shouldShowProjScore =
    showProjScore && (!isMultiExam || (projScoreRollups?.length ?? 0) > 0);

  const daysToExam = useMemo(() => {
    if (!examDate) return null;
    return computeDaysToExam(examDate);
  }, [examDate]);

  const animatedMastery = useCountUp(syllabusMasteryPercent ?? 0, 750, syllabusMasteryPercent != null);
  const animatedYesterday = useCountUp(
    yesterdayPercent,
    650,
    yesterdayTaskCount > 0,
  );
  const animatedToday = useCountUp(todayPercent, 650, todayTaskCount > 0);

  const masteryDisplay = useMemo(() => {
    if (syllabusMasteryPercent != null) {
      const v = animatedMastery;
      return `${v % 1 < 0.05 ? Math.round(v).toFixed(0) : v.toFixed(1)}%`;
    }
    return "—";
  }, [syllabusMasteryPercent, animatedMastery]);

  const projScoreDisplay = useMemo(() => {
    if (marksTotal > 0) {
      return `${Math.round(marksMastered)}/${Math.round(marksTotal)}`;
    }
    return "—";
  }, [marksMastered, marksTotal]);

  const yesterdayPlanDisplay = useMemo(() => {
    if (yesterdayTaskCount === 0) return "—";
    return `${Math.round(animatedYesterday)}%`;
  }, [yesterdayPercent, yesterdayTaskCount, animatedYesterday]);

  const todayPlanDisplay = useMemo(() => {
    if (todayTaskCount === 0) return "—";
    return `${Math.round(animatedToday)}%`;
  }, [todayPercent, todayTaskCount, animatedToday]);

  const divider = (
    <div
      className="w-px self-stretch"
      style={{ background: "rgba(186,117,23,0.2)" }}
      aria-hidden
    />
  );

  return (
    <section
      aria-label="Overview"
      aria-busy={loading}
      className="relative overflow-hidden rounded-[12px] bg-[#FFF3E4] p-5 dark:bg-kal-bg-elevated dark:ring-1 dark:ring-kal-border sm:px-6 sm:py-5"
    >
      {/* Subtle background blobs */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full opacity-40 blur-2xl dark:opacity-25"
        style={{ background: "#EF9F27" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-8 -left-8 size-24 rounded-full opacity-30 blur-2xl dark:opacity-20"
        style={{ background: "#FAC775" }}
        aria-hidden
      />

      <div className="relative">
        {/* Greeting */}
        <div className="mb-3">
          <p className="kal-home-hero-line">
            {greetingLead}, {firstName}
          </p>

          {/* Multi-exam subtitle: per-exam name + countdown */}
          {isMultiExam ? (
            <p className="mt-0.5 text-[11px] text-kal-text-secondary">
              {examRollups!.map((er, i) => {
                const name =
                  displayNameForExamCatalog(er.examLabel, catalogRows) ||
                  er.examLabel;
                const days =
                  er.examLabel && examDates?.[er.examLabel]
                    ? computeDaysToExam(examDates[er.examLabel])
                    : null;
                return (
                  <span key={er.examLabel}>
                    {i > 0 && (
                      <span className="mx-1.5 text-kal-muted">·</span>
                    )}
                    {name}
                    {days != null && (
                      <span className="ml-1 font-medium text-[#BA7517] dark:text-kal-accent-dark">
                        {days} day{days === 1 ? "" : "s"}
                      </span>
                    )}
                  </span>
                );
              })}
            </p>
          ) : (
            /* Single-exam subtitle unchanged */
            (examDisplayName ?? daysToExam != null) && (
              <p className="mt-0.5 text-[11px] text-kal-text-secondary">
                {examDisplayName ?? "NEET UG"}
                {daysToExam != null && (
                  <>
                    {" · "}
                    <span className="font-medium text-[#BA7517] dark:text-kal-accent-dark">
                      {daysToExam} day{daysToExam === 1 ? "" : "s"} to exam
                    </span>
                  </>
                )}
              </p>
            )
          )}
        </div>

        {/* Divider */}
        <div
          className="mb-0 h-px w-full"
          style={{ background: "rgba(186,117,23,0.2)" }}
          aria-hidden
        />

        {/* Stats row */}
        <div
          className="flex divide-x"
          style={{ "--divide-color": "rgba(186,117,23,0.2)" } as React.CSSProperties}
        >
          {/* Syllabus cell */}
          {isMultiExam ? (
            <div className="flex flex-1 flex-col items-center gap-1.5 px-1 py-3 text-center">
              {examRollups!.map((er) => {
                const name =
                  displayNameForExamCatalog(er.examLabel, catalogRows) ||
                  er.examLabel;
                const pct = er.rollup.overallPercent;
                const display =
                  pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(1);
                return (
                  <div key={er.examLabel} className="flex flex-col items-center gap-0">
                    <span className="text-sm font-bold tabular-nums leading-tight text-kal-text">
                      {display}%
                    </span>
                    <span className="text-[9px] leading-tight text-kal-muted">
                      {name}
                    </span>
                  </div>
                );
              })}
              <span className="mt-0.5 text-[10px] leading-tight text-kal-muted">
                Syllabus
              </span>
            </div>
          ) : (
            <StatCell
              value={masteryDisplay}
              label="Syllabus"
              ariaLabel={
                syllabusMasteryPercent != null
                  ? `${syllabusMasteryPercent.toFixed(1)} percent of syllabus complete`
                  : "Syllabus data unavailable"
              }
            />
          )}

          {shouldShowProjScore && divider}

          {/* Proj. score cell — hidden for exams without verified prev-year marks data */}
          {shouldShowProjScore && (
            isMultiExam ? (
              <div className="flex flex-1 flex-col items-center gap-1.5 px-1 py-3 text-center">
                {loading ? (
                  <>
                    <StatNumberSkeleton />
                    <span className="mt-0.5 text-[10px] leading-tight text-kal-muted">
                      Proj. score
                    </span>
                  </>
                ) : (
                  <>
                    {(projScoreRollups ?? []).map((er) => {
                      const name =
                        displayNameForExamCatalog(er.examLabel, catalogRows) ||
                        er.examLabel;
                      const proj = er.projections[0];
                      const scoreStr = proj
                        ? `${proj.projectedOutOf720}/${er.maxScore}`
                        : er.rollup.totalMarksPool > 0
                          ? `${er.rollup.totalMarksMastered.toFixed(0)}/${er.rollup.totalMarksPool.toFixed(0)}`
                          : "—";
                      return (
                        <div key={er.examLabel} className="flex flex-col items-center gap-0">
                          <span className="text-sm font-bold tabular-nums leading-tight text-kal-text">
                            {scoreStr}
                          </span>
                          <span className="text-[9px] leading-tight text-kal-muted">
                            {name}
                          </span>
                        </div>
                      );
                    })}
                    <span className="mt-0.5 text-[10px] leading-tight text-kal-muted">
                      Proj. score
                    </span>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center gap-0.5 px-2 py-3 text-center">
                {loading ? (
                  <StatNumberSkeleton />
                ) : (
                  <span
                    className="kal-home-stat-value"
                    aria-label={
                      marksTotal > 0
                        ? `Projected score ${Math.round(marksMastered)} out of ${Math.round(marksTotal)}${
                            projectedScoreCaption ? `. ${projectedScoreCaption}` : ""
                          }`
                        : "Projected score unavailable"
                    }
                  >
                    {projScoreDisplay}
                  </span>
                )}
                <span className="text-[10px] leading-tight text-kal-muted">
                  Proj. score
                </span>
                {!loading && projectedScoreCaption ? (
                  <span className="min-w-0 max-w-full px-0.5 text-[9px] leading-snug text-kal-muted sm:whitespace-nowrap sm:px-1">
                    {projectedScoreCaption}
                  </span>
                ) : null}
              </div>
            )
          )}

          {divider}

          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 px-1 py-2 text-center sm:gap-2.5 sm:py-3">
            <div className="flex flex-col items-center gap-0.5">
              {loading ? (
                <StatNumberSkeleton compact />
              ) : (
                <span
                  className="kal-home-stat-value text-[18px] sm:text-[20px]"
                  aria-label={
                    todayTaskCount > 0
                      ? `Today's plan ${Math.round(todayPercent)} percent done`
                      : "No plan created today"
                  }
                >
                  {todayPlanDisplay}
                </span>
              )}
              <span className="text-[10px] leading-tight text-kal-muted">
                Today&apos;s plan
              </span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              {loading ? (
                <StatNumberSkeleton compact />
              ) : (
                <span
                  className="kal-home-stat-value text-[18px] sm:text-[20px]"
                  aria-label={
                    yesterdayTaskCount > 0
                      ? `Yesterday's plan ${Math.round(yesterdayPercent)} percent done`
                      : "No plan yesterday"
                  }
                >
                  {yesterdayPlanDisplay}
                </span>
              )}
              <span className="text-[10px] leading-tight text-kal-muted">
                Yesterday&apos;s plan
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
