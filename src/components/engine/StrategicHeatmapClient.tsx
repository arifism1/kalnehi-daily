"use client";

import { useMemo } from "react";

import { usePrimaryExamLabel } from "@/hooks/usePrimaryExamLabel";
import { useSyllabusTracker } from "@/hooks/useSyllabusTracker";
import { shouldShowSyllabusComingSoon } from "@/lib/examProfile";
import { buildStrategicRows } from "@/lib/engine/strategicHeatmapData";

import { SyllabusComingSoon } from "@/components/syllabus/SyllabusComingSoon";

import { EngineCard, EngineHero } from "./EngineHero";

export function StrategicHeatmapClient() {
  const { examLabel, loading: examLoading } = usePrimaryExamLabel();
  const { rows, rollup, cuetAwaitingDomainSelection, loading, error } =
    useSyllabusTracker();
  const comingSoon = shouldShowSyllabusComingSoon({
    examLabel,
    examLabelLoading: examLoading,
    syllabusLoading: loading,
    syllabusError: error,
    syllabusRowCount: rows.length,
    cuetAwaitingDomainSelection,
  });

  const strategic = useMemo(
    () => buildStrategicRows(rollup.chapters, rows),
    [rollup.chapters, rows],
  );

  const topWeak = useMemo(() => strategic.filter((r) => !r.isChapterMastered).slice(0, 12), [strategic]);

  return (
    <div className="space-y-6">
      <EngineHero
        eyebrow="Priority map"
        title="Strategic Heatmap"
        description="Conquer weak chapters with high marks weight first — priority blends gap × chapter pool so you don’t scatter effort."
      />

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900 dark:border-rose-500/30 dark:bg-rose-950/20 dark:text-rose-200">
          {error}
        </p>
      )}

      {loading && (
        <p className="text-sm text-kal-text-secondary">Loading syllabus rollup…</p>
      )}

      {!loading && rows.length === 0 && (
        <>
          {comingSoon && examLabel ? (
            <SyllabusComingSoon variant="compact" examLabel={examLabel} />
          ) : (
            <p className="text-sm text-kal-text-secondary">
              Open Syllabus to load chapters — we’ll map weak vs high-yield areas.
            </p>
          )}
        </>
      )}

      {!loading && rows.length > 0 && (
        <EngineCard title="High-yield · still open">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm text-kal-text">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-kal-text-secondary">
                  <th className="pb-2 pr-3 font-semibold">Subject</th>
                  <th className="pb-2 pr-3 font-semibold">Chapter</th>
                  <th className="pb-2 pr-3 font-semibold tabular-nums">
                    Micro %
                  </th>
                  <th className="pb-2 pr-3 font-semibold tabular-nums">
                    Weight
                  </th>
                  <th className="pb-2 font-semibold tabular-nums">Priority</th>
                </tr>
              </thead>
              <tbody>
                {topWeak.map((r) => {
                  const heat =
                    r.microtopicProgressPercent < 30
                      ? "bg-rose-50 dark:bg-rose-500/10"
                      : r.microtopicProgressPercent < 70
                        ? "bg-amber-50 dark:bg-amber-500/10"
                        : "bg-red-50 dark:bg-kal-accent/10";
                  return (
                    <tr
                      key={`${r.subject}::${r.chapter}`}
                      className={`border-t border-kal-border/80 ${heat}`}
                    >
                      <td className="py-2.5 pr-3 font-medium text-kal-text">
                        {r.subject}
                      </td>
                      <td className="py-2.5 pr-3 text-kal-text-secondary">
                        {r.chapter}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums text-kal-text-secondary">
                        {r.microtopicProgressPercent.toFixed(0)}%
                      </td>
                      <td className="py-2.5 pr-3 font-medium tabular-nums text-kal-accent">
                        {r.chapterMarksTotal.toFixed(1)}
                      </td>
                      <td className="py-2.5 font-semibold tabular-nums text-kal-text">
                        {r.priorityScore.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-kal-border/80 bg-kal-card-muted px-3 py-3 text-[11px] leading-relaxed text-kal-text-secondary">
              <p className="font-medium text-kal-text">Get the ranking working for you</p>
              <p className="mt-1.5">
                To get accurate priority ranking, update your chapter weightages from
                the last three exam years—you can enter one, two, or all three; we
                average only the years you fill, so you’re never forced to guess data
                you don’t have.
              </p>
              <p className="mt-2">
                Go to <span className="font-medium text-kal-text">Syllabus Tracker</span>
                , expand any chapter, then tap the{" "}
                <span className="font-medium text-kal-text">Marks</span> button (sliders
                icon). A few minutes there makes this heatmap reflect what actually
                moves your score.
              </p>
            </div>
            <p className="text-[11px] leading-relaxed text-kal-text-secondary">
              Priority = (gap to 100% micro completion) × weight (averaged marks
              pool). Use it to sequence high-impact chapters before mocks.
            </p>
          </div>
        </EngineCard>
      )}
    </div>
  );
}
