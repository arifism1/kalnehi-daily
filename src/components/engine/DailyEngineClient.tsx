"use client";

import { format, parseISO, subDays } from "date-fns";
import { useMemo } from "react";

import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useDailyPlanExecutionForRange } from "@/hooks/useDailyPlanExecutionForRange";
import { useRefreshTasksOnHomeFocus } from "@/hooks/useRefreshTasksOnHomeFocus";
import { buildDailyEngineSnapshot } from "@/lib/engine/dailyProgressDashboard";
import {
  DAILY_PROGRESS_HEADLINE,
  PROGRESS_MESSAGE_LABEL,
} from "@/lib/progressEngine";
import { useTaskStore } from "@/store/useTaskStore";

import { EngineCard, EngineHero } from "./EngineHero";

const BAND_LABEL: Record<string, string> = {
  flawless: "Flawless",
  strong: "Strong",
  mediocre: "Mediocre",
  danger: "Danger",
  no_plan: "No plan",
};

const BAND_LABEL_UNKNOWN = "Unknown";

export function DailyEngineClient() {
  useRefreshTasksOnHomeFocus();
  const today = useCalendarDate();
  const tasksRecord = useTaskStore((s) => s.tasks);
  const microRecord = useTaskStore((s) => s.microtopics);

  const overlayStart = useMemo(
    () => format(subDays(parseISO(today), 7), "yyyy-MM-dd"),
    [today],
  );
  const dailyPlanOverlay = useDailyPlanExecutionForRange(overlayStart, today);

  const snap = useMemo(() => {
    const tasks = Object.values(tasksRecord);
    return buildDailyEngineSnapshot(today, tasks, microRecord, dailyPlanOverlay);
  }, [today, tasksRecord, microRecord, dailyPlanOverlay]);

  return (
    <div className="space-y-6">
      <EngineHero
        eyebrow="Execution"
        title="Daily Progress Engine"
        description="Weighted completion across your plan — calibrated for serious JEE & NEET execution. Track the trend, protect your rank."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <EngineCard title="Today · weighted completion">
          <p className="text-4xl font-bold tabular-nums text-kal-accent">
            {Math.round(snap.todayWeightedPercent * 10) / 10}%
          </p>
          <p className="mt-2 text-sm text-kal-muted">
            {DAILY_PROGRESS_HEADLINE[snap.todayBand]}
          </p>
          <p className="mt-1 text-xs text-kal-muted">
            Signal: {PROGRESS_MESSAGE_LABEL[snap.progressMessage]}
          </p>
        </EngineCard>

        <EngineCard title="7-day average">
          <p className="text-4xl font-bold tabular-nums text-kal-text">
            {snap.sevenDayAvg}%
          </p>
          <p className="mt-2 text-sm text-kal-muted">
            Rolling mean on days with at least one target.
          </p>
        </EngineCard>

        <EngineCard title="Reality scope (to date)">
          <p className="text-4xl font-bold tabular-nums text-kal-accent">
            {Math.round(snap.realityWeightedPercent * 10) / 10}%
          </p>
          <p className="mt-2 text-sm text-kal-muted">
            All tasks on or before today — weighted.
          </p>
        </EngineCard>
      </div>

      <EngineCard title="7-day consistency heat">
        <div className="flex flex-wrap gap-2">
          {snap.trend.map((d) => (
            <div
              key={d.date}
              className="flex min-w-[4.5rem] flex-col rounded-xl border border-kal-border bg-kal-card-muted p-2 text-center"
            >
              <span className="text-[10px] font-medium uppercase tracking-wide text-kal-muted">
                {d.date.slice(5)}
              </span>
              <span className="mt-1 text-lg font-bold tabular-nums text-kal-text">
                {d.taskCount === 0 ? "—" : `${Math.round(d.weightedPercent)}%`}
              </span>
              <span className="mt-0.5 text-[10px] text-kal-muted">
                {d.taskCount === 0
                  ? "No data"
                  : BAND_LABEL[d.band] ?? BAND_LABEL_UNKNOWN}
              </span>
            </div>
          ))}
        </div>
      </EngineCard>

      {snap.daysBehind != null && snap.daysBehind > 0 && (
        <p className="rounded-xl border border-kal-warn-border bg-kal-warn-soft px-4 py-3 text-sm text-kal-warn-text dark:border-amber-500/25 dark:bg-amber-950/20 dark:text-amber-100/90">
          Execution drift: about{" "}
          <span className="font-semibold tabular-nums">{snap.daysBehind}</span>{" "}
          day{snap.daysBehind === 1 ? "" : "s"} since your last strong anchor —
          tighten Plan and Master today.
        </p>
      )}
    </div>
  );
}
