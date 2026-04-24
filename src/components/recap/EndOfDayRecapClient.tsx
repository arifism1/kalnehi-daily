"use client";

import { format, parseISO } from "date-fns";
import { Loader2, Share2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";

import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useRecapForDay } from "@/hooks/useRecapForDay";
import {
  exportShareablePng,
  shareOrDownloadPng,
} from "@/lib/shareCardExport";
import { formatSecondsShort } from "@/lib/dailyExecutionStats";

export function EndOfDayRecapClient() {
  const today = useCalendarDate();
  const recap = useRecapForDay(today);
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const onShare = useCallback(async () => {
    const el = cardRef.current;
    if (!el) return;
    setBusy(true);
    try {
      const blob = await exportShareablePng(el, { pixelRatio: 2 });
      await shareOrDownloadPng(blob, `kalnehi-recap-${today}.png`);
    } finally {
      setBusy(false);
    }
  }, [today]);

  const datePretty = format(parseISO(today), "EEEE, MMM d");

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 pb-8">
      <div>
        <h1 className="kal-section-heading">Today&apos;s recap</h1>
        <p className="mt-1 text-sm text-kal-text-secondary">
          Cinematic card — screenshot or share to Stories.
        </p>
      </div>

      {recap.loading ? (
        <div
          className="flex min-h-[320px] items-center justify-center rounded-2xl border border-kal-border/60 bg-kal-card-muted/30"
          aria-busy="true"
        >
          <Loader2 className="h-8 w-8 animate-spin text-kal-accent" />
        </div>
      ) : (
        <>
          <div className="flex justify-center">
            <div
              ref={cardRef}
              className="flex w-[min(100%,360px)] flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-6 text-white shadow-2xl aspect-[9/16] min-h-[560px]"
              style={{ fontFamily: "var(--font-geist-sans, system-ui)" }}
            >
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-200/90">
                  Kalnehi Daily
                </p>
                <p className="mt-3 font-serif text-2xl font-normal leading-tight text-white">
                  {datePretty}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-zinc-300">
                  You showed up. Here&apos;s the proof.
                </p>
              </div>

              <div className="space-y-5">
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    Tasks done
                  </p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums text-white">
                    {recap.completedTasks}
                    <span className="text-lg font-normal text-zinc-500">
                      {" "}
                      / {Math.max(recap.plannedTasks, recap.completedTasks)}
                    </span>
                  </p>
                  {recap.plannedTasks > 0 ? (
                    <p className="mt-1 text-xs text-zinc-400">
                      {Math.round(recap.weightedPercent)}% of plan (weighted)
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-zinc-400">
                      No unified daily plan — academic tasks only
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    Hours studied
                  </p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums text-white">
                    {formatSecondsShort(recap.studySeconds)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Timers + on-task sessions (today)
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    Streak
                  </p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums text-amber-200">
                    {recap.streakDays}
                    <span className="text-lg font-normal text-zinc-500">
                      {" "}
                      day{recap.streakDays === 1 ? "" : "s"}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Execution streak (60%+ on planned days)
                  </p>
                </div>
              </div>

              <p className="text-center text-[10px] text-zinc-500">
                kalnehi.com
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => void onShare()}
              disabled={busy}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-kal-accent px-6 text-sm font-semibold text-white shadow-md transition-colors hover:opacity-95 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              Share image
            </button>
            <Link
              href="/recap/weekly"
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-kal-border bg-kal-card-muted px-6 text-sm font-semibold text-kal-text transition-colors hover:bg-kal-accent hover:text-white"
            >
              Weekly magazine
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
