"use client";

import { format, parseISO } from "date-fns";
import { Loader2, Share2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";

import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useWeeklyRecap } from "@/hooks/useWeeklyRecap";
import { useTargetExamDisplay } from "@/hooks/useTargetExamDisplay";
import { formatSecondsShort } from "@/lib/dailyExecutionStats";
import {
  exportShareablePng,
  shareOrDownloadPng,
} from "@/lib/shareCardExport";

export function WeeklyMagazineClient() {
  const today = useCalendarDate();
  const weekly = useWeeklyRecap(today);
  const { examDisplayName } = useTargetExamDisplay();
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const onShare = useCallback(async () => {
    const el = cardRef.current;
    if (!el) return;
    setBusy(true);
    try {
      const blob = await exportShareablePng(el, { pixelRatio: 2 });
      await shareOrDownloadPng(blob, `kalnehi-week-${today}.png`);
    } finally {
      setBusy(false);
    }
  }, [today]);

  const plannedDays = weekly.days.filter((d) => d.hasPlan).length;
  const avgPct =
    plannedDays > 0
      ? Math.round(
          weekly.days
            .filter((d) => d.hasPlan)
            .reduce((a, d) => a + d.percent, 0) / plannedDays,
        )
      : 0;

  const issueLabel = format(parseISO(today), "MMM yyyy").toUpperCase();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 pb-8">
      <div>
        <h1 className="kal-section-heading">Weekly magazine</h1>
        <p className="mt-1 text-sm text-kal-text-secondary">
          Cover-style recap for Instagram Stories (9:16).
        </p>
      </div>

      {weekly.loading ? (
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
              className="relative flex w-[min(100%,360px)] flex-col overflow-hidden rounded-sm border-4 border-double border-amber-900/40 bg-[#2a1810] text-amber-50 shadow-2xl aspect-[9/16] min-h-[560px]"
            >
              <div className="absolute inset-0 opacity-[0.07] bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,#000_2px,#000_3px)]" />
              <div className="relative flex flex-1 flex-col p-6 pt-10">
                <p className="text-[10px] font-bold tracking-[0.35em] text-amber-400/90">
                  KALNEHI · {issueLabel}
                </p>
                <p className="mt-6 font-serif text-4xl font-bold leading-[0.95] tracking-tight text-amber-100">
                  THE
                  <br />
                  WEEKLY
                  <br />
                  REPORT
                </p>
                <div className="my-5 h-px w-16 bg-amber-500/50" />
                <p className="text-xs font-medium uppercase tracking-widest text-amber-200/80">
                  {weekly.rangeLabel}
                </p>
                {examDisplayName ? (
                  <p className="mt-2 text-sm italic text-amber-100/80">
                    {examDisplayName}
                  </p>
                ) : null}

                <div className="mt-auto space-y-4 pb-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/80">
                      Study time
                    </p>
                    <p className="font-serif text-3xl text-amber-50">
                      {formatSecondsShort(weekly.weekStudySeconds)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/80">
                      Days planned
                    </p>
                    <p className="font-serif text-3xl text-amber-50">
                      {plannedDays}
                      <span className="text-lg text-amber-200/60"> / 7</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/80">
                      Avg execution
                    </p>
                    <p className="font-serif text-3xl text-amber-50">
                      {plannedDays > 0 ? `${avgPct}%` : "—"}
                    </p>
                  </div>
                  {weekly.wowDelta != null && Math.abs(weekly.wowDelta) >= 0.5 ? (
                    <p className="text-xs leading-snug text-amber-200/85">
                      {weekly.wowDelta > 0 ? "▲" : "▼"}{" "}
                      {Math.abs(weekly.wowDelta).toFixed(1)} pts vs last week
                      (on days you planned).
                    </p>
                  ) : null}
                </div>
                <p className="relative text-center text-[9px] uppercase tracking-[0.2em] text-amber-500/70">
                  Share your grind · kalnehi.com
                </p>
              </div>
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
              Share cover
            </button>
            <Link
              href="/recap"
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-kal-border bg-kal-card-muted px-6 text-sm font-semibold text-kal-text transition-colors hover:bg-kal-accent hover:text-white"
            >
              Daily recap
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
