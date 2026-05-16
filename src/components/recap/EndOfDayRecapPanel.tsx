"use client";

import { format, parseISO } from "date-fns";
import { Loader2, Share2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { useRecapForDay } from "@/hooks/useRecapForDay";
import { useShareCardIdentity } from "@/hooks/useShareCardIdentity";
import { fetchBacklogRecoverySummaryForHome } from "@/actions/backlogRecovery";
import { formatSecondsShort } from "@/lib/dailyExecutionStats";
import {
  exportShareablePng,
  shareOrDownloadPng,
} from "@/lib/shareCardExport";

export type EndOfDayRecapPanelProps = {
  /** Calendar day yyyy-MM-dd to summarize */
  isoDate: string;
  /** When false (e.g. inside end-of-day sheet), magazine links hide — use footer links instead */
  showMagazineLinks?: boolean;
};

export function EndOfDayRecapPanel({
  isoDate,
  showMagazineLinks = true,
}: EndOfDayRecapPanelProps) {
  const recap = useRecapForDay(isoDate);
  const { userDisplayName, examLine } = useShareCardIdentity();
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [backlogPending, setBacklogPending] = useState<number | null>(null);

  useEffect(() => {
    let c = false;
    void (async () => {
      const s = await fetchBacklogRecoverySummaryForHome();
      if (!c && s.ok) setBacklogPending(s.pendingCount);
    })();
    return () => {
      c = true;
    };
  }, [isoDate]);

  useEffect(() => {
    const nav = window.navigator as Navigator & { standalone?: boolean };
    setIsStandalone(
      nav.standalone === true ||
        window.matchMedia("(display-mode: standalone)").matches,
    );
  }, []);

  const onShare = useCallback(async () => {
    const el = cardRef.current;
    if (!el) return;
    setBusy(true);
    setShareError(null);
    try {
      const blob = await exportShareablePng(el, { pixelRatio: 2 });
      await shareOrDownloadPng(blob, `kalnehi-recap-${isoDate}.png`);
    } catch {
      setShareError("Could not share the image. Try again.");
    } finally {
      setBusy(false);
    }
  }, [isoDate]);

  const datePretty = format(parseISO(isoDate), "EEEE, MMM d");
  const dateCompact = format(parseISO(isoDate), "MMM d").toUpperCase();
  const planPct =
    recap.plannedTasks > 0 ? Math.round(recap.weightedPercent) : null;

  if (recap.loading) {
    return (
      <div
        className="flex min-h-[320px] items-center justify-center rounded-2xl border border-kal-border/60 bg-kal-card-muted/30"
        aria-busy="true"
      >
        <Loader2 className="h-8 w-8 animate-spin text-kal-accent" />
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-center">
        <div
          ref={cardRef}
          className="relative flex w-[min(100%,360px)] flex-col overflow-hidden rounded-3xl border border-white/12 bg-slate-950 text-white shadow-[0_25px_60px_-15px_rgba(15,23,42,0.85)] aspect-[9/16] min-h-[560px]"
          style={{ fontFamily: "var(--font-geist-sans, system-ui)" }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              background:
                "radial-gradient(ellipse 100% 70% at 100% 0%, rgba(192,132,252,0.2), transparent 52%), radial-gradient(ellipse 90% 65% at 0% 100%, rgba(244,114,182,0.14), transparent 48%), radial-gradient(ellipse 70% 50% at 50% 50%, rgba(99,102,241,0.06), transparent 60%), linear-gradient(195deg, #020617 0%, #0f172a 42%, #020617 100%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
              backgroundSize: "24px 24px",
            }}
          />

          <div className="relative flex h-full flex-col px-6 pb-5 pt-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-violet-200/90">
                  Kalnehi Daily
                </p>
                <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.12em] text-slate-500">
                  Daily closeout
                </p>
              </div>
              <div className="shrink-0 rounded-full border border-fuchsia-400/35 bg-fuchsia-950/50 px-3 py-1 text-center shadow-[0_0_20px_-4px_rgba(232,121,249,0.35)]">
                <p className="text-[8px] font-bold uppercase leading-tight tracking-[0.12em] text-fuchsia-100/95">
                  Today
                </p>
                <p className="text-[11px] font-bold tabular-nums leading-none text-fuchsia-50">
                  {dateCompact}
                </p>
              </div>
            </div>

            <div className="mt-7">
              <p className="text-[2.4rem] font-extralight leading-[0.92] tracking-[-0.03em] text-white">
                Daily
              </p>
              <p className="-mt-0.5 text-[2.4rem] font-semibold leading-[0.92] tracking-[-0.03em] bg-gradient-to-r from-violet-200 via-fuchsia-200 to-rose-200 bg-clip-text text-transparent">
                closeout
              </p>
            </div>

            <p className="mt-4 text-[13px] font-medium leading-snug text-slate-200">
              {datePretty}
            </p>

            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 shadow-inner shadow-black/20">
              <p className="text-sm font-semibold text-slate-100">
                {userDisplayName}
              </p>
              {examLine ? (
                <p className="mt-1 text-xs leading-snug text-violet-200/80">
                  {examLine}
                </p>
              ) : null}
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              You showed up — here&apos;s the proof.
            </p>

            {planPct != null ? (
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <span>Plan execution</span>
                  <span className="tabular-nums text-violet-200/90">{planPct}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-rose-400"
                    style={{ width: `${Math.min(100, planPct)}%` }}
                  />
                </div>
              </div>
            ) : null}

            <div className="mt-auto space-y-2.5 pt-5">
              <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-3 shadow-sm">
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Tasks done
                </p>
                <p className="mt-1.5 text-2xl font-semibold tabular-nums text-white">
                  {recap.completedTasks}
                  <span className="text-base font-medium text-slate-400">
                    {" "}
                    / {Math.max(recap.plannedTasks, recap.completedTasks)}
                  </span>
                </p>
                {recap.plannedTasks > 0 ? (
                  <p className="mt-1 text-[11px] text-slate-500">Weighted vs plan</p>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Academic tasks only today
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-3 shadow-sm">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Study time
                  </p>
                  <p className="mt-1.5 text-lg font-semibold tabular-nums leading-tight text-white">
                    {formatSecondsShort(recap.studySeconds)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-3 shadow-sm">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Streak
                  </p>
                  <p className="mt-1.5 text-lg font-semibold tabular-nums leading-tight">
                    <span className="bg-gradient-to-br from-amber-200 to-orange-200 bg-clip-text text-transparent">
                      {recap.streakDays}
                    </span>
                    <span className="text-sm font-medium text-slate-400">d</span>
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-3 text-center text-[9px] uppercase tracking-[0.22em] text-slate-500">
              {isStandalone ? "Kalnehi Daily" : "kalnehi.com"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
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
        {showMagazineLinks ? (
          <>
            <Link
              href="/recap/weekly"
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-kal-border bg-kal-card-muted px-6 text-sm font-semibold text-kal-text transition-colors hover:bg-kal-accent hover:text-white"
            >
              Weekly magazine
            </Link>
            <Link
              href="/recap/monthly"
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-kal-border bg-kal-card-muted px-6 text-sm font-semibold text-kal-text transition-colors hover:bg-kal-accent hover:text-white"
            >
              Monthly magazine
            </Link>
          </>
        ) : null}
      </div>
      {backlogPending != null && backlogPending > 0 ? (
        <p className="mx-auto max-w-md text-center text-sm leading-relaxed text-kal-muted">
          Still catching up on{" "}
          <span className="font-semibold text-kal-text">{backlogPending}</span> backlog{" "}
          item{backlogPending === 1 ? "" : "s"} —{" "}
          <Link href="/backlogs" className="font-semibold text-kal-accent underline">
            Backlogs
          </Link>{" "}
          keeps everything in motion.
        </p>
      ) : null}
      {backlogPending !== null && backlogPending === 0 ? (
        <p className="mx-auto max-w-md text-center text-xs text-kal-muted">
          Nothing pending in your recovery list right now.
        </p>
      ) : null}
      {shareError ? (
        <p className="text-center text-sm text-red-500">{shareError}</p>
      ) : null}
    </>
  );
}
