"use client";

import clsx from "clsx";
import confetti from "canvas-confetti";
import { TrendingUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useLiveTargetBar } from "@/hooks/useLiveTargetBar";
import { useSyllabusTracker } from "@/hooks/useSyllabusTracker";
import {
  estimateRankFromBands,
  formatRankEstimateDisplay,
  type ExamScoreRankBandRow,
} from "@/lib/rankPrediction";
import { projectedMarksFromRollup } from "@/lib/syllabusProjectionTrack";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type Props = {
  /** Fired when projected marks increase (for celebrations + return hook). */
  onProjectionIncreased?: (delta: number, newScore: number) => void;
};

export function SyllabusProjectionHeader({ onProjectionIncreased }: Props) {
  const { rollup, maxScore, catalogExamKey, loading } = useSyllabusTracker();
  const liveTarget = useLiveTargetBar();
  const [bands, setBands] = useState<ExamScoreRankBandRow[]>([]);
  const prevScoreRef = useRef<number | null>(null);
  const [bump, setBump] = useState(false);

  useEffect(() => {
    void (async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.from("exam_score_rank_bands").select("*");
      if (data && Array.isArray(data)) {
        const rows = data as ExamScoreRankBandRow[];
        setBands(
          rows.map((r) => ({
            exam_name: r.exam_name,
            score_min: Number(r.score_min),
            score_max: Number(r.score_max),
            rank_min: r.rank_min,
            rank_max: r.rank_max,
            percentile: r.percentile != null ? Number(r.percentile) : null,
            label: r.label,
            sort_order: r.sort_order,
          })),
        );
      }
    })();
  }, []);

  const projected = useMemo(
    () => projectedMarksFromRollup(rollup, maxScore),
    [rollup, maxScore],
  );

  const targetScore =
    liveTarget.visible && liveTarget.targetScore > 0 ? liveTarget.targetScore : null;

  const rankEstimate = useMemo(
    () => estimateRankFromBands(catalogExamKey ?? null, projected, bands),
    [catalogExamKey, projected, bands],
  );

  useEffect(() => {
    if (loading) return;
    const prev = prevScoreRef.current;
    if (prev != null && projected > prev) {
      setBump(true);
      const t = window.setTimeout(() => setBump(false), 900);
      confetti({
        particleCount: 48,
        spread: 62,
        origin: { y: 0.72 },
        colors: ["#ff7a00", "#ffb347", "#ffffff"],
      });
      onProjectionIncreased?.(projected - prev, projected);
      prevScoreRef.current = projected;
      return () => window.clearTimeout(t);
    }
    if (prev == null) prevScoreRef.current = projected;
  }, [projected, loading, onProjectionIncreased]);

  if (loading || maxScore <= 0) return null;

  return (
    <section
      className={clsx(
        "kal-glass-panel rounded-2xl border border-kal-accent/25 p-4 transition-transform duration-300",
        bump && "scale-[1.02] ring-2 ring-kal-accent/40",
      )}
      aria-live="polite"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
            Live projection
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-kal-text sm:text-3xl">
            {projected}
            <span className="text-lg font-semibold text-kal-muted">/{maxScore}</span>
          </p>
          {targetScore != null ? (
            <p className="mt-1 text-sm text-kal-text-secondary">
              Target <span className="font-semibold tabular-nums">{targetScore}</span>
              {projected < targetScore ? (
                <span className="text-kal-muted">
                  {" "}
                  · {targetScore - projected} marks to go
                </span>
              ) : (
                <span className="text-kal-accent"> · at/above target</span>
              )}
            </p>
          ) : null}
        </div>
        {rankEstimate ? (
          <div className="rounded-xl bg-kal-accent/10 px-3 py-2 text-right">
            <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-kal-muted">
              Rank estimate
            </p>
            <p className="text-sm font-semibold text-kal-text">
              {formatRankEstimateDisplay(rankEstimate)}
            </p>
            <p className="text-[0.65rem] text-kal-muted">Illustrative only</p>
          </div>
        ) : null}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-kal-muted">
        <TrendingUp className="size-3.5 shrink-0 text-kal-accent" aria-hidden />
        Tick chapters you&apos;ve covered — this number climbs with every mark.
      </p>
    </section>
  );
}
