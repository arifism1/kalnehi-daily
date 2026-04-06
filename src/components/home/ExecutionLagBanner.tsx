"use client";

import { Skull } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { useCalendarDate } from "@/hooks/useCalendarDate";
import { computeDaysBehindExecution } from "@/lib/progressEngine";
import { useTaskStore } from "@/store/useTaskStore";

const LAG_THRESHOLD_DAYS = 3;

export function ExecutionLagBanner() {
  const today = useCalendarDate();
  const tasksRecord = useTaskStore((s) => s.tasks);
  const taskList = useMemo(() => Object.values(tasksRecord), [tasksRecord]);

  const daysBehind = useMemo(
    () => computeDaysBehindExecution(taskList, today),
    [taskList, today],
  );

  if (daysBehind == null || daysBehind < LAG_THRESHOLD_DAYS) {
    return null;
  }

  return (
    <section
      className="overflow-hidden rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-950/40 to-slate-950/50 p-4 shadow-lg shadow-rose-950/20 backdrop-blur-sm sm:rounded-3xl sm:p-5"
      aria-labelledby="lag-heading"
    >
      <div className="flex gap-3 sm:gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-400/25 bg-rose-500/15 text-rose-200 sm:h-12 sm:w-12 sm:rounded-2xl">
          <Skull className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2
            id="lag-heading"
            className="text-[10px] font-bold uppercase tracking-[0.16em] text-rose-200/95 sm:text-xs sm:tracking-[0.2em]"
          >
            Close the gap
          </h2>
          <p className="mt-1.5 text-xs font-semibold leading-snug text-rose-50/95 sm:mt-2 sm:text-sm">
            The exam doesn&apos;t wait. You are {daysBehind} days behind — open
            Plan and take today back.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:mt-5 sm:flex-row sm:flex-wrap">
            <Link
              href="/plan"
              className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-2xl bg-white px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-900 shadow-md transition-all duration-200 hover:bg-slate-100 active:scale-[0.99] sm:flex-initial"
            >
              Reset Reality
            </Link>
            <Link
              href="/#arena"
              className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-2xl border border-rose-400/40 bg-rose-950/40 px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-rose-100 transition-all duration-200 hover:bg-rose-950/60 sm:flex-initial"
            >
              Resume Execution
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
