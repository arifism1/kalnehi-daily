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
    () => buildStrategicRows(rollup.chapters),
    [rollup.chapters],
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
        <p className="rounded-xl border border-rose-500/30 bg-rose-950/20 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}

      {loading && (
        <p className="text-sm text-zinc-500">Loading syllabus rollup…</p>
      )}

      {!loading && rows.length === 0 && (
        <>
          {comingSoon && examLabel ? (
            <SyllabusComingSoon variant="compact" examLabel={examLabel} />
          ) : (
            <p className="text-sm text-zinc-500">
              Open Syllabus to load chapters — we’ll map weak vs high-yield areas.
            </p>
          )}
        </>
      )}

      {!loading && rows.length > 0 && (
        <EngineCard title="High-yield · still open">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-zinc-500">
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
                      ? "bg-rose-500/10"
                      : r.microtopicProgressPercent < 70
                        ? "bg-amber-500/10"
                        : "bg-emerald-500/10";
                  return (
                    <tr
                      key={`${r.subject}::${r.chapter}`}
                      className={`border-t border-white/[0.04] ${heat}`}
                    >
                      <td className="py-2.5 pr-3 text-zinc-200">{r.subject}</td>
                      <td className="py-2.5 pr-3 text-zinc-300">{r.chapter}</td>
                      <td className="py-2.5 pr-3 tabular-nums text-zinc-400">
                        {r.microtopicProgressPercent.toFixed(0)}%
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums text-emerald-200/90">
                        {r.chapterMarksTotal.toFixed(1)}
                      </td>
                      <td className="py-2.5 font-semibold tabular-nums text-white">
                        {r.priorityScore.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-zinc-500">
            Priority ≈ (gap to 100% micro completion) × chapter marks pool — use
            it to sequence brutal honesty before mocks.
          </p>
        </EngineCard>
      )}
    </div>
  );
}
