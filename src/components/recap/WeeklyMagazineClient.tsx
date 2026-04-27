"use client";

import { format, parseISO } from "date-fns";
import { Loader2, Share2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useShareCardIdentity } from "@/hooks/useShareCardIdentity";
import { useWeeklyRecap } from "@/hooks/useWeeklyRecap";
import { formatSecondsShort } from "@/lib/dailyExecutionStats";
import {
  exportShareablePng,
  shareOrDownloadPng,
} from "@/lib/shareCardExport";

export function WeeklyMagazineClient() {
  const today = useCalendarDate();
  const weekly = useWeeklyRecap(today);
  const { userDisplayName, examLine } = useShareCardIdentity();
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

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
      await shareOrDownloadPng(blob, `kalnehi-week-${today}.png`);
    } catch {
      setShareError("Could not share the image. Try again.");
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

  const issueLabel = (() => {
    const firstDay = weekly.days[0]?.date;
    const lastDay = weekly.days[weekly.days.length - 1]?.date;
    if (!firstDay || !lastDay)
      return format(parseISO(today), "MMM yyyy").toUpperCase();
    const firstMonth = format(parseISO(firstDay), "MMM");
    const lastMonth = format(parseISO(lastDay), "MMM");
    const year = format(parseISO(lastDay), "yyyy");
    return firstMonth === lastMonth
      ? `${lastMonth} ${year}`.toUpperCase()
      : `${firstMonth}–${lastMonth} ${year}`.toUpperCase();
  })();

  const rangePretty = weekly.rangeLabel.replace(" → ", " — ");

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
              className="relative flex w-[min(100%,360px)] flex-col overflow-hidden rounded-3xl border border-white/12 bg-slate-950 text-white shadow-[0_25px_60px_-15px_rgba(15,23,42,0.85)] aspect-[9/16] min-h-[560px]"
              style={{ fontFamily: "var(--font-geist-sans, system-ui)" }}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-90"
                style={{
                  background:
                    "radial-gradient(ellipse 110% 75% at 0% 0%, rgba(129,140,248,0.22), transparent 52%), radial-gradient(ellipse 85% 60% at 100% 30%, rgba(251,191,36,0.12), transparent 50%), radial-gradient(ellipse 70% 55% at 50% 100%, rgba(99,102,241,0.1), transparent 48%), linear-gradient(175deg, #020617 0%, #0c1222 40%, #020617 100%)",
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
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-indigo-200/90">
                      Kalnehi Daily
                    </p>
                    <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.12em] text-slate-500">
                      Week in motion
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <div className="rounded-full border border-amber-400/35 bg-amber-950/45 px-2.5 py-1 text-center shadow-[0_0_18px_-4px_rgba(251,191,36,0.3)]">
                      <p className="text-[8px] font-bold uppercase leading-tight tracking-[0.08em] text-amber-100/95">
                        Rolling
                      </p>
                      <p className="text-sm font-bold tabular-nums leading-none text-amber-50">
                        7<span className="text-[10px] font-semibold">d</span>
                      </p>
                    </div>
                    <p className="max-w-[7rem] text-right text-[8px] font-semibold uppercase leading-tight tracking-[0.06em] text-indigo-300/70">
                      {issueLabel}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-[2.55rem] font-extralight leading-[0.92] tracking-[-0.03em] text-white">
                    Weekly
                  </p>
                  <p className="-mt-0.5 text-[2.55rem] font-semibold leading-[0.92] tracking-[-0.03em] bg-gradient-to-r from-indigo-200 via-amber-200 to-violet-200 bg-clip-text text-transparent">
                    sprint
                  </p>
                </div>

                <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                  {rangePretty}
                </p>

                <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 shadow-inner shadow-black/20">
                  <p className="text-sm font-semibold text-slate-100">
                    {userDisplayName}
                  </p>
                  {examLine ? (
                    <p className="mt-1 text-xs leading-snug text-indigo-200/75">
                      {examLine}
                    </p>
                  ) : null}
                </div>

                <div className="mt-5">
                  <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Last 7 days · {weekly.days[0]?.dow ?? ""} →{" "}
                    {weekly.days[weekly.days.length - 1]?.dow ?? ""}
                  </p>
                  <div
                    className="w-full rounded-xl bg-slate-900/90 px-1.5 py-2 ring-1 ring-white/10"
                    role="img"
                    aria-label="One bar per day: execution on days you had a plan"
                  >
                    <div className="flex gap-1">
                      {weekly.days.map((d) => {
                        const maxBar = 26;
                        const barPx = !d.hasPlan
                          ? 4
                          : Math.max(
                              6,
                              Math.round(6 + (d.percent / 100) * (maxBar - 6)),
                            );
                        const barClass = !d.hasPlan
                          ? "bg-slate-700/90"
                          : d.percent >= 60
                            ? "bg-gradient-to-t from-indigo-600 to-amber-300"
                            : "bg-gradient-to-t from-rose-800 to-amber-500";
                        return (
                          <div
                            key={d.date}
                            className="flex min-w-0 flex-1 flex-col items-center gap-1"
                          >
                            <div className="flex h-8 w-full items-end justify-center">
                              <div
                                className={`w-full max-w-[22px] rounded-md ${barClass}`}
                                style={{ height: barPx }}
                              />
                            </div>
                            <span className="text-[8px] font-semibold uppercase text-slate-500">
                              {d.dow.slice(0, 1)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-auto grid grid-cols-2 gap-2.5 pt-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-3 shadow-sm">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Study time
                    </p>
                    <p className="mt-1.5 text-lg font-semibold tabular-nums leading-tight text-white">
                      {formatSecondsShort(weekly.weekStudySeconds)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-3 shadow-sm">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Days planned
                    </p>
                    <p className="mt-1.5 text-lg font-semibold tabular-nums leading-tight text-white">
                      {plannedDays}
                      <span className="text-sm font-medium text-slate-400">
                        /7
                      </span>
                    </p>
                  </div>
                  <div className="col-span-2 rounded-2xl border border-white/10 bg-white/[0.07] p-3 shadow-sm">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Avg execution
                    </p>
                    <p className="mt-1.5 text-lg font-semibold tabular-nums text-white">
                      {plannedDays > 0 ? `${avgPct}%` : "—"}
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        on days you planned
                      </span>
                    </p>
                  </div>
                </div>

                {weekly.wowDelta != null && Math.abs(weekly.wowDelta) >= 0.5 ? (
                  <div className="mt-3 rounded-xl border border-indigo-400/30 bg-indigo-950/40 px-3 py-2">
                    <p className="text-center text-[11px] leading-snug text-indigo-100/90">
                      <span className="font-semibold tabular-nums">
                        {weekly.wowDelta > 0 ? "▲" : "▼"}{" "}
                        {Math.abs(weekly.wowDelta).toFixed(1)} pts
                      </span>
                      <span className="text-indigo-200/75">
                        {" "}
                        vs prior 7 days
                      </span>
                    </p>
                  </div>
                ) : null}

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
              Share cover
            </button>
            <Link
              href="/recap"
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-kal-border bg-kal-card-muted px-6 text-sm font-semibold text-kal-text transition-colors hover:bg-kal-accent hover:text-white"
            >
              Daily recap
            </Link>
            <Link
              href="/recap/monthly"
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-kal-border bg-kal-card-muted px-6 text-sm font-semibold text-kal-text transition-colors hover:bg-kal-accent hover:text-white"
            >
              Monthly magazine
            </Link>
          </div>
          {shareError && (
            <p className="text-center text-sm text-red-500">{shareError}</p>
          )}
        </>
      )}
    </div>
  );
}
