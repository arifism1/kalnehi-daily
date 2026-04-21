"use client";

import {
  addMonths,
  format,
  startOfMonth,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { useRefreshTasksOnHomeFocus } from "@/hooks/useRefreshTasksOnHomeFocus";
import {
  buildMonthHeatmap,
  monthLabel,
} from "@/lib/engine/calendarHeatmap";
import { useTaskStore } from "@/store/useTaskStore";

import { EngineCard, EngineHero } from "./EngineHero";
import { ConsistencyIllustration } from "@/components/illustrations/ConsistencyIllustration";

const HEAT: Record<
  "green" | "yellow" | "red" | "grey",
  string
> = {
  green:
    "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-100 dark:shadow-[inset_0_0_0_1px_rgba(16,185,129,0.22)]",
  yellow:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-100 dark:shadow-[inset_0_0_0_1px_rgba(245,158,11,0.2)]",
  red:
    "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-500/40 dark:bg-orange-500/20 dark:text-orange-100 dark:shadow-[inset_0_0_0_1px_rgba(249,115,22,0.2)]",
  grey:
    "border-kal-border bg-kal-card-muted text-kal-muted",
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarEngineClient() {
  useRefreshTasksOnHomeFocus();
  const tasksRecord = useTaskStore((s) => s.tasks);
  const microRecord = useTaskStore((s) => s.microtopics);

  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const year = cursor.getFullYear();
  const monthIndex0 = cursor.getMonth();

  const cells = useMemo(() => {
    const tasks = Object.values(tasksRecord);
    return buildMonthHeatmap(year, monthIndex0, tasks, microRecord);
  }, [year, monthIndex0, tasksRecord, microRecord]);

  const leadBlank = useMemo(() => {
    if (cells.length === 0) return 0;
    const wd = cells[0]!.weekday;
    return (wd + 6) % 7;
  }, [cells]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <ConsistencyIllustration className="mx-auto w-full max-w-[180px] shrink-0 sm:mx-0" />
        <EngineHero
          eyebrow="Consistency"
          title="Consistency Tracker"
          description="Full monthly view with execution heat: green above 80%, yellow 50–80%, red below 50%, grey when no targets that day."
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setCursor((c) => subMonths(c, 1))}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-kal-border bg-kal-card text-kal-text hover:bg-kal-card-muted"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="text-center text-lg font-semibold text-kal-text">
          {monthLabel(year, monthIndex0)}
        </p>
        <button
          type="button"
          onClick={() => setCursor((c) => addMonths(c, 1))}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-kal-border bg-kal-card text-kal-text hover:bg-kal-card-muted"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <EngineCard title="Heatmap legend">
        <div className="flex flex-wrap gap-3 text-[11px] text-kal-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-emerald-500/55" /> &gt;80%
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-amber-500/45" /> 50–80%
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-orange-500/50" /> &lt;50%
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-kal-border" /> No data
          </span>
        </div>
      </EngineCard>

      <div className="overflow-x-auto rounded-2xl border border-kal-border bg-kal-card-muted p-4 sm:p-5">
        <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-kal-muted sm:text-xs">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1.5">
          {Array.from({ length: leadBlank }).map((_, i) => (
            <div key={`pad-${i}`} className="aspect-square min-h-[2.5rem]" />
          ))}
          {cells.map((c) => (
            <div
              key={c.date}
              title={
                c.weightedPercent == null
                  ? `${c.date} — no targets`
                  : `${c.date} — ${Math.round(c.weightedPercent)}% · ${c.taskCount} tasks`
              }
              className={`flex aspect-square min-h-[2.5rem] flex-col items-center justify-center rounded-xl border text-[11px] font-semibold sm:text-sm ${HEAT[c.band]}`}
            >
              <span className="tabular-nums">{format(new Date(c.date + "T12:00:00"), "d")}</span>
              {c.taskCount > 0 && c.weightedPercent != null && (
                <span className="mt-0.5 text-[9px] font-medium opacity-90 sm:text-[10px]">
                  {Math.round(c.weightedPercent)}%
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
