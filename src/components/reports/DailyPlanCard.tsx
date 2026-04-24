"use client";

import { format, parseISO } from "date-fns";
import { CalendarDays, Sparkles } from "lucide-react";

type DailyPlanCardProps = {
  dateYmd: string;
  doneCount: number;
  totalCount: number;
  title?: string;
};

/**
 * Screenshot-friendly “Battle Plan” card (Daily Plan).
 */
export function DailyPlanCard({
  dateYmd,
  doneCount,
  totalCount,
  title = "Battle Plan",
}: DailyPlanCardProps) {
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const d = format(parseISO(dateYmd), "EEE, d MMM");
  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-200/60 bg-gradient-to-br from-[#1a0f0a] via-zinc-900 to-zinc-950 p-5 text-left text-white shadow-2xl ring-1 ring-white/10">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-amber-500/20 blur-3xl"
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/80">
            {title}
          </p>
          <h2 className="mt-1 font-serif text-2xl font-bold tracking-tight">
            {d}
          </h2>
        </div>
        <Sparkles className="h-7 w-7 shrink-0 text-amber-300" aria-hidden />
      </div>
      <div className="mt-5 flex items-end gap-3">
        <div className="text-4xl font-black tabular-nums leading-none text-amber-300">
          {pct}
          <span className="text-lg font-bold text-amber-200/60">%</span>
        </div>
        <div className="min-w-0 flex-1 pb-1 text-sm text-zinc-300">
          {doneCount} / {totalCount} missions locked. Every tick moves the scoreboard.
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-zinc-400">
        <CalendarDays className="h-3.5 w-3.5" aria-hidden />
        Kalnehi Daily
      </div>
    </div>
  );
}
