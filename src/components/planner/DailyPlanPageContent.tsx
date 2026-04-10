"use client";

import { addDays, format, parseISO } from "date-fns";
import { ArrowLeft, CalendarDays } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { DailyPlanTypedQuickAdd } from "@/components/planner/DailyPlanTypedQuickAdd";
import { UnifiedDailyPlanList } from "@/components/planner/UnifiedDailyPlanList";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useAuthStore } from "@/store/useAuthStore";

export function DailyPlanPageContent() {
  const user = useAuthStore((s) => s.user);
  const today = useCalendarDate();
  const [logDate, setLogDate] = useState(today);
  const [planListKey, bumpPlanList] = useState(0);

  if (!user) {
    return (
      <p className="mx-auto max-w-lg rounded-xl border border-kal-warn-border bg-kal-warn-soft px-4 py-3 text-sm text-kal-warn-text">
        Sign in to view and edit your daily plan.
      </p>
    );
  }

  return (
    <div className="relative mx-auto max-w-2xl pb-16 pt-2 sm:pt-4">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-kal-accent hover:text-kal-accent-hover"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Home
      </Link>

      <header className="mt-6 mb-6">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-kal-accent">
          Planning
        </p>
        <h1 className="mt-2 flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-kal-text sm:text-3xl">
          <CalendarDays className="h-8 w-8 text-kal-accent" aria-hidden />
          Daily planner
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-kal-muted">
          One plan per day: everything you add by voice, scan, or typing appears here together.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex min-h-[44px] items-center gap-1 rounded-xl border border-kal-border bg-kal-card-muted p-1">
          {[
            { id: today, label: "Today" },
            { id: format(addDays(parseISO(today), -1), "yyyy-MM-dd"), label: "Yesterday" },
            { id: format(addDays(parseISO(today), 1), "yyyy-MM-dd"), label: "Tomorrow" },
          ].map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setLogDate(d.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                logDate === d.id
                  ? "bg-kal-accent text-white"
                  : "text-kal-muted hover:text-kal-text"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <label className="block text-[11px] font-medium text-kal-muted">
          Date
          <input
            type="date"
            value={logDate}
            onChange={(e) => setLogDate(e.target.value)}
            className="mt-1 block min-h-[44px] rounded-xl border border-kal-border bg-kal-input-bg px-3 text-sm text-kal-text"
          />
        </label>
      </div>

      <DailyPlanTypedQuickAdd
        planDate={logDate}
        onAdded={() => bumpPlanList((n) => n + 1)}
      />

      <div className="mt-6 space-y-3">
        <UnifiedDailyPlanList
          key={planListKey}
          planDate={logDate}
          title="All tasks"
        />
        <p className="text-center text-xs text-kal-muted">
          Voice:{" "}
          <Link href="/dictate-day" className="font-semibold text-kal-accent hover:underline">
            Dictate My Day
          </Link>
          {" · "}
          Handwritten:{" "}
          <Link href="/paste-handwritten" className="font-semibold text-kal-accent hover:underline">
            Scanner
          </Link>
        </p>
      </div>
    </div>
  );
}
