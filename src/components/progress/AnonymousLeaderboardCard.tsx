"use client";

import { useEffect, useCallback, useState } from "react";
import { RotateCcw } from "lucide-react";

import { getAnonymousLeaderboardLine } from "@/actions/leaderboard";

export function AnonymousLeaderboardCard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [line, setLine] = useState<Awaited<
    ReturnType<typeof getAnonymousLeaderboardLine>
  > | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getAnonymousLeaderboardLine().then((res) => {
      if (cancelled) return;
      setLine(res);
      if (!res.ok) setError(res.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchKey]);

  const retry = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  if (loading) {
    return (
      <div className="kal-glass-card rounded-2xl p-5 space-y-3" aria-busy="true">
        <div className="h-3 w-40 animate-pulse rounded bg-kal-border/30" />
        <div className="h-4 w-full max-w-md animate-pulse rounded bg-kal-border/20" />
        <div className="h-3 w-52 animate-pulse rounded bg-kal-border/15" />
      </div>
    );
  }

  if (error || !line?.ok) {
    return (
      <div className="kal-glass-card rounded-2xl p-5 space-y-3">
        <p className="text-sm text-kal-text-secondary">
          {error ?? "Could not load leaderboard."}
        </p>
        <button
          type="button"
          onClick={retry}
          className="flex items-center gap-1.5 rounded-xl border border-kal-border bg-kal-card-muted px-3 py-1.5 text-xs font-semibold text-kal-text transition-colors hover:bg-kal-accent/10"
        >
          <RotateCcw className="h-3 w-3" aria-hidden />
          Retry
        </button>
      </div>
    );
  }

  const d = line.data;

  if (!d.hasSnapshot) {
    return (
      <div className="kal-glass-card rounded-2xl p-5 space-y-2">
        <h2 className="kal-section-heading">Anonymous leaderboard</h2>
        <p className="text-sm text-kal-text-secondary leading-relaxed">
          Your weekly cohort rank appears after the daily snapshot runs. Keep
          logging study time and syllabus progress — you will see how you compare
          to other {d.examGroupLabel} on Kalnehi (no names, just your band).
        </p>
      </div>
    );
  }

  if (d.topPercent == null || d.cohortSize < 20) {
    return (
      <div className="kal-glass-card rounded-2xl p-5 space-y-2">
        <h2 className="kal-section-heading">Anonymous leaderboard</h2>
        <p className="text-sm text-kal-text-secondary leading-relaxed">
          Not enough peers in your exam cohort this week to show a percentile
          yet. Check back as more students stay active.
        </p>
      </div>
    );
  }

  return (
    <div className="kal-glass-card rounded-2xl p-5 space-y-2">
      <h2 className="kal-section-heading">Anonymous leaderboard</h2>
      <p className="text-base text-kal-text leading-relaxed">
        You&apos;re in the top{" "}
        <span className="font-semibold text-kal-accent">{d.topPercent}%</span>{" "}
        of {d.examGroupLabel} on Kalnehi this week.
      </p>
      {d.stale ? (
        <p className="text-[11px] text-kal-muted">
          Rankings update daily; numbers may be up to a day behind.
        </p>
      ) : (
        <p className="text-[11px] text-kal-muted">
          Based on this week&apos;s study hours and syllabus completion (same
          weighting as your Progress ring). Fully anonymous — no public list.
        </p>
      )}
    </div>
  );
}
