"use client";

import { Share2, TrendingUp } from "lucide-react";
import { useCallback, useState } from "react";

import { TapBounce } from "@/components/ui/TapBounce";

type WeeklyReportCardProps = {
  xp: number;
  consistencyPercent: number;
  leaderboardLine: string | null;
  topSubject: string;
};

/**
 * Magazine-style weekly snapshot + Web Share.
 */
export function WeeklyReportCard({
  xp,
  consistencyPercent,
  leaderboardLine,
  topSubject,
}: WeeklyReportCardProps) {
  const [shared, setShared] = useState(false);
  const onShare = useCallback(async () => {
    const text = `This week: ${xp} XP · ${consistencyPercent}% execution · ${topSubject} focus. ${leaderboardLine ?? ""} — Kalnehi Daily.`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ text, title: "My Kalnehi week" });
        setShared(true);
        return;
      } catch {
        /* fall through */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setShared(true);
    } catch {
      setShared(true);
    }
  }, [xp, consistencyPercent, topSubject, leaderboardLine]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-zinc-200/20 bg-zinc-950 p-5 text-left text-zinc-50">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(244,196,48,0.2),transparent_50%)]"
        aria-hidden
      />
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-200/80">
        Weekly
      </p>
      <h3 className="mt-1 font-serif text-2xl font-black italic">Your Week</h3>
      <p className="mt-0.5 text-sm text-zinc-400">Execution doesn’t lie.</p>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-3">
          <TrendingUp className="h-4 w-4 text-amber-400" />
          <p className="mt-2 text-2xl font-black tabular-nums">{xp} XP</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-3">
          <p className="text-[10px] font-bold text-zinc-500">CONSISTENCY</p>
          <p className="mt-1 text-2xl font-black tabular-nums">
            {consistencyPercent}%
          </p>
        </div>
      </div>
      {leaderboardLine && (
        <p className="mt-3 text-xs text-zinc-400">{leaderboardLine}</p>
      )}
      <p className="mt-1 text-sm font-semibold text-amber-200/90">
        Top push: {topSubject}
      </p>
      <TapBounce className="mt-4">
        <button
          type="button"
          onClick={() => void onShare()}
          className="inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-sm font-bold text-amber-200"
        >
          <Share2 className="h-4 w-4" />
          {shared ? "Shared / copied" : "Share on Instagram or everywhere"}
        </button>
      </TapBounce>
    </div>
  );
}
