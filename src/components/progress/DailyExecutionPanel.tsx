"use client";

import clsx from "clsx";
import { useId, useMemo } from "react";

import { CircularProgressRing } from "@/components/ui/CircularProgressRing";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { classifyDailyProgressBand } from "@/lib/progressEngine";
import {
  buildDailyExecutionSeries,
  compareExecutionWeekOverWeek,
  computeDayExecutionSnapshot,
  computeExecutionStreak,
  formatMinutesShort,
  formatSecondsShort,
} from "@/lib/dailyExecutionStats";
import { useTaskStore } from "@/store/useTaskStore";

export function DailyExecutionPanel() {
  const today = useCalendarDate();
  const tasksRecord = useTaskStore((s) => s.tasks);
  const microRecord = useTaskStore((s) => s.microtopics);

  const gid = useId().replace(/:/g, "");
  const gradientId = `dex-${gid}`;

  const allTasks = useMemo(() => Object.values(tasksRecord), [tasksRecord]);

  const todaySnap = useMemo(
    () => computeDayExecutionSnapshot(allTasks, microRecord, today),
    [allTasks, microRecord, today],
  );

  const series7 = useMemo(
    () => buildDailyExecutionSeries(allTasks, microRecord, today, 7),
    [allTasks, microRecord, today],
  );

  const streak = useMemo(
    () => computeExecutionStreak(allTasks, microRecord, today, 60),
    [allTasks, microRecord, today],
  );

  const wow = useMemo(
    () => compareExecutionWeekOverWeek(allTasks, microRecord, today),
    [allTasks, microRecord, today],
  );

  const band = classifyDailyProgressBand(
    todaySnap.weightedPercent,
    todaySnap.plannedTasks,
  );

  const headlinePercent = Math.round(todaySnap.weightedPercent * 10) / 10;
  const ringPercent = Math.min(
    100,
    Math.max(0, todaySnap.weightedPercent),
  );

  const insights: string[] = [];
  if (streak >= 2) {
    insights.push(
      `You're on a ${streak}-day execution streak 🔥`,
    );
  }
  if (
    wow.deltaPoints != null &&
    Math.abs(wow.deltaPoints) >= 3 &&
    wow.lastWeekAvg != null
  ) {
    if (wow.deltaPoints > 0) {
      insights.push(
        `${Math.round(wow.deltaPoints)}% stronger execution vs last week (avg on days you planned).`,
      );
    } else {
      insights.push(
        `${Math.round(Math.abs(wow.deltaPoints))}% below last week's pace — one focused day resets the trend.`,
      );
    }
  }
  if (todaySnap.plannedTasks > 0) {
    if (todaySnap.weightedPercent >= 80) {
      insights.push("Great job today — you're clearing the plan.");
    } else if (todaySnap.weightedPercent < 50) {
      insights.push("Slight dip — lock the next task and push momentum.");
    }
  }

  const BAR_MAX_PX = 100;

  return (
    <section className="overflow-hidden rounded-2xl border border-kal-border bg-kal-card kal-shadow-card">
      <div className="border-b border-kal-border/80 bg-kal-card-muted/40 px-6 py-5 sm:px-8 sm:py-6">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-kal-accent sm:text-[0.7rem]">
          Daily execution
        </p>
        <h2 className="mt-1 text-lg font-bold tracking-tight text-kal-text sm:text-xl">
          Today&apos;s momentum
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-kal-text-secondary">
          Planned work vs what you&apos;ve finished — weighted by task marks so
          heavy topics count more.
        </p>
      </div>

      <div className="px-6 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-start lg:gap-10">
          <div className="flex flex-col items-center gap-4">
            <CircularProgressRing
              percent={ringPercent}
              gradientId={gradientId}
              size={168}
              strokeWidth={10}
              className="motion-safe:transition-transform motion-safe:duration-300"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-kal-muted">
                Today
              </span>
              <p className="mt-1 text-3xl font-bold tabular-nums text-kal-text sm:text-4xl">
                {todaySnap.plannedTasks === 0 ? (
                  "—"
                ) : (
                  <>
                    {headlinePercent % 1 === 0
                      ? headlinePercent.toFixed(0)
                      : headlinePercent.toFixed(1)}
                    <span className="align-super text-base font-semibold text-kal-accent">
                      %
                    </span>
                  </>
                )}
              </p>
            </CircularProgressRing>
            <p className="max-w-[16rem] text-center text-sm leading-relaxed text-kal-text-secondary">
              {todaySnap.plannedTasks === 0 ? (
                <>
                  Nothing on your plan for today — add targets in{" "}
                  <span className="font-medium text-kal-text">Plan</span> to
                  track execution here.
                </>
              ) : (
                <>
                  You completed{" "}
                  <span className="font-semibold tabular-nums text-kal-text">
                    {headlinePercent % 1 === 0
                      ? headlinePercent.toFixed(0)
                      : headlinePercent.toFixed(1)}
                    %
                  </span>{" "}
                  of your planned work today (by weight).
                </>
              )}
            </p>
          </div>

          <div className="min-w-0 flex-1 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-kal-border/80 bg-kal-card-muted/30 px-4 py-3.5 dark:border-slate-700/80 dark:bg-slate-950/30">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-kal-muted">
                  Tasks
                </p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-kal-text">
                  {todaySnap.completedTasks}
                  <span className="text-lg font-semibold text-kal-muted">
                    {" "}
                    / {todaySnap.plannedTasks}
                  </span>
                </p>
                <p className="mt-1 text-xs text-kal-text-secondary">
                  completed vs planned today
                </p>
              </div>
              <div className="rounded-xl border border-kal-border/80 bg-kal-card-muted/30 px-4 py-3.5 dark:border-slate-700/80 dark:bg-slate-950/30">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-kal-muted">
                  Time
                </p>
                <p className="mt-2 text-lg font-bold tabular-nums leading-snug text-kal-text">
                  {todaySnap.plannedMinutes > 0 ||
                  todaySnap.actualSecondsLogged > 0 ? (
                    <>
                      <span className="text-kal-accent">
                        {formatSecondsShort(todaySnap.actualSecondsLogged)}
                      </span>
                      <span className="font-semibold text-kal-muted">
                        {" "}
                        / {formatMinutesShort(todaySnap.plannedMinutes)}
                      </span>
                    </>
                  ) : (
                    <span className="text-kal-muted">—</span>
                  )}
                </p>
                <p className="mt-1 text-xs text-kal-text-secondary">
                  logged on today&apos;s tasks vs estimated plan
                </p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-kal-muted">
                Last 7 days
              </p>
              <p className="mt-1 text-xs text-kal-text-secondary">
                Completion % on days you had a plan (bar height).
              </p>
              <div
                className="mt-4 flex h-[7.5rem] items-end gap-1.5 sm:gap-2"
                role="img"
                aria-label="Daily completion percent last 7 days"
              >
                {series7.map((p) => {
                  const barPx = p.hasPlan
                    ? Math.max(
                        6,
                        Math.round((p.percent / 100) * BAR_MAX_PX),
                      )
                    : 3;
                  return (
                    <div
                      key={p.date}
                      className="flex min-w-0 flex-1 flex-col items-center gap-2"
                    >
                      <div className="flex h-[100px] w-full items-end justify-center">
                        <div
                          className={clsx(
                            "w-full max-w-[2.75rem] rounded-t-md motion-safe:transition-[height] motion-safe:duration-300",
                            p.hasPlan
                              ? p.date === today
                                ? "bg-kal-accent"
                                : "bg-kal-accent/55 dark:bg-red-500/50"
                              : "bg-kal-border/60 dark:bg-slate-700",
                          )}
                          style={{ height: `${barPx}px` }}
                          title={
                            p.hasPlan
                              ? `${p.dow}: ${p.percent.toFixed(0)}%`
                              : `${p.dow}: no plan`
                          }
                        />
                      </div>
                      <span className="text-[10px] font-medium text-kal-muted">
                        {p.dow}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {(insights.length > 0 || todaySnap.plannedTasks > 0) && (
              <ul className="space-y-2 rounded-xl border border-kal-accent/20 bg-kal-accent-soft/50 px-4 py-3.5 text-sm leading-relaxed text-kal-text dark:border-red-500/20 dark:bg-red-950/20 dark:text-red-50/95">
                {todaySnap.plannedTasks > 0 && (
                  <li className="font-medium">
                    {band === "flawless" && "Flawless — you won the day."}
                    {band === "strong" && "Strong execution — stay consistent."}
                    {band === "mediocre" && "Room left — knock out the next win."}
                    {band === "danger" && "Heavy lift still open — prioritize one block."}
                    {band === "no_plan" && "Add plan items to measure execution."}
                  </li>
                )}
                {insights.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
