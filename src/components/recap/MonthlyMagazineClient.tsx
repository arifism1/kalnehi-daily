"use client";

import { Loader2, Share2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useMonthlyRecap } from "@/hooks/useMonthlyRecap";
import { useShareCardIdentity } from "@/hooks/useShareCardIdentity";
import {
  formatSecondsShort,
  MONTHLY_RECAP_WINDOW_DAYS,
} from "@/lib/dailyExecutionStats";
import {
  exportShareablePng,
  shareOrDownloadPng,
} from "@/lib/shareCardExport";

export function MonthlyMagazineClient() {
  const today = useCalendarDate();
  const monthly = useMonthlyRecap(today);
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
      await shareOrDownloadPng(blob, `kalnehi-month-${today}.png`);
    } catch {
      setShareError("Could not share the image. Try again.");
    } finally {
      setBusy(false);
    }
  }, [today]);

  const plannedDays = monthly.days.filter((d) => d.hasPlan).length;
  const avgPct =
    plannedDays > 0
      ? Math.round(
          monthly.days
            .filter((d) => d.hasPlan)
            .reduce((a, d) => a + d.percent, 0) / plannedDays,
        )
      : 0;

  const rangePretty = monthly.rangeLabel.replace(" → ", " — ");

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 pb-8">
      <div>
        <h1 className="kal-section-heading">Monthly magazine</h1>
        <p className="mt-1 text-sm text-kal-text-secondary">
          Last {MONTHLY_RECAP_WINDOW_DAYS} days — cover-style recap for Stories
          (9:16).
        </p>
      </div>

      {monthly.loading ? (
        <div
          className="flex min-h-[320px] items-center justify-center rounded-2xl border border-kal-border/60 bg-kal-card-muted/30"
          aria-busy="true"
        >
          <Loader2 className="size-8 animate-spin text-kal-accent" />
        </div>
      ) : (
        <>
          <div className="flex justify-center">
            <div
              ref={cardRef}
              className="relative flex w-[min(100%,360px)] flex-col overflow-hidden rounded-3xl border border-white/12 bg-slate-950 text-white shadow-[0_25px_60px_-15px_rgba(15,23,42,0.85)] aspect-[9/16] min-h-[560px]"
              style={{ fontFamily: "var(--font-geist-sans, system-ui)" }}
            >
              {/* Ambient layers — PNG-safe (no backdrop-filter) */}
              <div
                className="pointer-events-none absolute inset-0 opacity-90"
                style={{
                  background:
                    "radial-gradient(ellipse 120% 80% at 0% 0%, rgba(34,211,238,0.18), transparent 55%), radial-gradient(ellipse 90% 70% at 100% 15%, rgba(167,139,250,0.14), transparent 50%), radial-gradient(ellipse 80% 60% at 50% 100%, rgba(45,212,191,0.08), transparent 45%), linear-gradient(165deg, #020617 0%, #0f172a 38%, #020617 100%)",
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
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-200/85">
                      Kalnehi Daily
                    </p>
                    <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.12em] text-slate-500">
                      Execution digest
                    </p>
                  </div>
                  <div className="shrink-0 rounded-full border border-cyan-400/35 bg-cyan-950/55 px-3 py-1 text-center shadow-[0_0_20px_-4px_rgba(34,211,238,0.35)]">
                    <p className="text-[8px] font-bold uppercase leading-tight tracking-[0.08em] text-cyan-100/90">
                      Rolling
                    </p>
                    <p className="text-sm font-bold tabular-nums leading-none text-cyan-50">
                      {MONTHLY_RECAP_WINDOW_DAYS}
                      <span className="text-[10px] font-semibold text-cyan-200/80">
                        d
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-7">
                  <p className="text-[2.65rem] font-extralight leading-[0.92] tracking-[-0.03em] text-white">
                    Monthly
                  </p>
                  <p className="-mt-0.5 text-[2.65rem] font-semibold leading-[0.92] tracking-[-0.03em] bg-gradient-to-r from-cyan-200 via-teal-200 to-emerald-200 bg-clip-text text-transparent">
                    digest
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
                    <p className="mt-1 text-xs leading-snug text-cyan-200/75">
                      {examLine}
                    </p>
                  ) : null}
                </div>

                <div className="mt-5">
                  <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Last {MONTHLY_RECAP_WINDOW_DAYS} days
                  </p>
                  <div
                    className="flex h-8 w-full items-end gap-px rounded-md bg-slate-900/90 px-1 pb-1 pt-1 ring-1 ring-white/10"
                    role="img"
                    aria-label="One bar per day: taller bars mean stronger execution on days you had a plan"
                  >
                    {monthly.days.map((d) => {
                      const maxBar = 22;
                      const barPx = !d.hasPlan
                        ? 4
                        : Math.max(
                            6,
                            Math.round(6 + (d.percent / 100) * (maxBar - 6)),
                          );
                      const barClass = !d.hasPlan
                        ? "bg-slate-700/90"
                        : d.percent >= 60
                          ? "bg-gradient-to-t from-teal-600 to-cyan-300"
                          : "bg-gradient-to-t from-amber-800 to-amber-400";
                      return (
                        <div
                          key={d.date}
                          className="flex min-w-0 flex-1 justify-center"
                        >
                          <div
                            className={`w-full max-w-[7px] rounded-sm ${barClass}`}
                            style={{ height: barPx }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-auto grid grid-cols-2 gap-2.5 pt-5">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-3 shadow-sm">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Study time
                    </p>
                    <p className="mt-1.5 text-lg font-semibold tabular-nums leading-tight text-white">
                      {formatSecondsShort(monthly.monthStudySeconds)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-3 shadow-sm">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                      Days planned
                    </p>
                    <p className="mt-1.5 text-lg font-semibold tabular-nums leading-tight text-white">
                      {plannedDays}
                      <span className="text-sm font-medium text-slate-400">
                        /{MONTHLY_RECAP_WINDOW_DAYS}
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

                {monthly.priorWindowDelta != null &&
                Math.abs(monthly.priorWindowDelta) >= 0.5 ? (
                  <div className="mt-3 rounded-xl border border-cyan-500/25 bg-cyan-950/35 px-3 py-2">
                    <p className="text-center text-[11px] leading-snug text-cyan-100/90">
                      <span className="font-semibold tabular-nums">
                        {monthly.priorWindowDelta > 0 ? "▲" : "▼"}{" "}
                        {Math.abs(monthly.priorWindowDelta).toFixed(1)} pts
                      </span>
                      <span className="text-cyan-200/75">
                        {" "}
                        vs prior {MONTHLY_RECAP_WINDOW_DAYS} days
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
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Share2 className="size-4" />
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
              href="/recap/weekly"
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-kal-border bg-kal-card-muted px-6 text-sm font-semibold text-kal-text transition-colors hover:bg-kal-accent hover:text-white"
            >
              Weekly magazine
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
