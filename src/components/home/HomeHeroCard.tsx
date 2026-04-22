"use client";

import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import { useMemo } from "react";

import { useTargetExamDate } from "@/hooks/useTargetExamDate";

export type HomeHeroCardProps = {
  firstName: string;
  greetingLead: string;
  /** Syllabus coverage % (0–100), null when unavailable */
  syllabusMasteryPercent: number | null;
  /** Projected/mastered marks numerator */
  marksMastered: number;
  /** Projected/mastered marks denominator */
  marksTotal: number;
  /** Today's plan completion 0–100 */
  todayPercent: number;
  /** Number of tasks planned today */
  todayTaskCount: number;
  /** Human-readable exam name, e.g. "NEET UG" */
  examDisplayName?: string | null;
  /** Muted line under "Proj. score" when showing multi-year exam-scale average */
  projectedScoreCaption?: string | null;
};

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

export function HomeHeroCard({
  firstName,
  greetingLead,
  syllabusMasteryPercent,
  marksMastered,
  marksTotal,
  todayPercent,
  todayTaskCount,
  examDisplayName,
  projectedScoreCaption,
}: HomeHeroCardProps) {
  const { examDate } = useTargetExamDate();

  const daysToExam = useMemo(() => {
    if (!examDate) return null;
    const today = startOfDay(new Date());
    const exam = startOfDay(parseISO(examDate));
    const diff = differenceInCalendarDays(exam, today);
    return diff > 0 ? diff : null;
  }, [examDate]);

  const masteryDisplay = useMemo(() => {
    if (syllabusMasteryPercent != null) {
      const v = syllabusMasteryPercent;
      return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}%`;
    }
    return "—";
  }, [syllabusMasteryPercent]);

  const projScoreDisplay = useMemo(() => {
    if (marksTotal > 0) {
      return `${Math.round(marksMastered)}/${Math.round(marksTotal)}`;
    }
    return "—";
  }, [marksMastered, marksTotal]);

  const todayPlanDisplay = useMemo(() => {
    if (todayTaskCount === 0) return "—";
    return `${Math.round(todayPercent)}%`;
  }, [todayPercent, todayTaskCount]);

  return (
    <section
      aria-label="Overview"
      className="relative overflow-hidden rounded-[12px] bg-[#FFF3E4] px-5 py-5 dark:bg-kal-bg-elevated dark:ring-1 dark:ring-kal-border sm:px-6 sm:py-5"
    >
      {/* Subtle background blobs */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-40 blur-2xl dark:opacity-25"
        style={{ background: "#EF9F27" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-8 -left-8 h-24 w-24 rounded-full opacity-30 blur-2xl dark:opacity-20"
        style={{ background: "#FAC775" }}
        aria-hidden
      />

      <div className="relative">
        {/* Greeting */}
        <div className="mb-3">
          <p className="kal-home-hero-line">
            {greetingLead}, {firstName}
          </p>
          {(examDisplayName ?? daysToExam != null) && (
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
          <StatCell
            value={masteryDisplay}
            label="Syllabus"
            ariaLabel={
              syllabusMasteryPercent != null
                ? `${syllabusMasteryPercent.toFixed(1)} percent of syllabus complete`
                : "Syllabus data unavailable"
            }
          />
          <div
            className="w-px self-stretch"
            style={{ background: "rgba(186,117,23,0.2)" }}
            aria-hidden
          />
          <div className="flex flex-1 flex-col items-center gap-0.5 px-2 py-3 text-center">
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
            <span className="text-[10px] leading-tight text-kal-muted">
              Proj. score
            </span>
            {projectedScoreCaption ? (
              <span className="min-w-0 max-w-full px-0.5 text-[9px] leading-snug text-kal-muted sm:whitespace-nowrap sm:px-1">
                {projectedScoreCaption}
              </span>
            ) : null}
          </div>
          <div
            className="w-px self-stretch"
            style={{ background: "rgba(186,117,23,0.2)" }}
            aria-hidden
          />
          <StatCell
            value={todayPlanDisplay}
            label="Today's plan"
            ariaLabel={
              todayTaskCount > 0
                ? `Today's plan ${Math.round(todayPercent)} percent done`
                : "No plan created today"
            }
          />
        </div>
      </div>
    </section>
  );
}
