"use client";

import { addDays, format, parseISO } from "date-fns";
import { ArrowLeft, CalendarDays, Mic, Type, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { UnifiedDailyPlanList } from "@/components/planner/UnifiedDailyPlanList";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useAuthStore } from "@/store/useAuthStore";

export function DailyPlanPageContent() {
  const user = useAuthStore((s) => s.user);
  const today = useCalendarDate();
  const [logDate, setLogDate] = useState(today);

  if (!user) {
    return (
      <p className="mx-auto max-w-lg rounded-xl border border-kal-warn-border bg-kal-warn-soft px-4 py-3 text-sm text-kal-warn-text">
        Sign in to view your daily plan.
      </p>
    );
  }

  const DATE_CHIPS = [
    { id: today, label: "Today" },
    { id: format(addDays(parseISO(today), -1), "yyyy-MM-dd"), label: "Yesterday" },
    { id: format(addDays(parseISO(today), 1), "yyyy-MM-dd"), label: "Tomorrow" },
  ];

  const isChipDate = DATE_CHIPS.some((d) => d.id === logDate);

  return (
    <div className="relative mx-auto max-w-2xl pb-16 pt-2 sm:pt-4">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-kal-accent hover:text-kal-accent-hover"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Home
      </Link>

      <header className="mt-6 mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Zap className="h-5 w-5 text-kal-accent" aria-hidden />
          <h1 className="kal-feature-title">
            Today&apos;s plan{" "}
            <span className="text-sm font-semibold text-kal-muted sm:text-base">
              (live)
            </span>
          </h1>
        </div>
        <p className="mt-2">
          <Link
            href="/target-score-blueprint"
            className="text-sm font-semibold text-kal-accent underline-offset-4 hover:underline"
          >
            Plan toward a target score
          </Link>
        </p>
      </header>

      {/* Date chips + date picker */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex min-h-[40px] items-center gap-1 rounded-xl border border-kal-border bg-kal-card-muted p-1">
          {DATE_CHIPS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setLogDate(d.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                logDate === d.id
                  ? "bg-kal-accent text-white"
                  : "text-kal-muted hover:text-kal-text"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Arbitrary date picker */}
        <label className="flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-xl border border-kal-border bg-kal-card-muted px-3 py-1 text-xs font-semibold text-kal-muted transition-colors hover:text-kal-text">
          <CalendarDays className="h-3.5 w-3.5 text-kal-accent" aria-hidden />
          <span className="sr-only">Pick a date</span>
          {!isChipDate && (
            <span className="text-kal-accent">
              {format(parseISO(logDate), "d MMM")}
            </span>
          )}
          <input
            type="date"
            value={logDate}
            onChange={(e) => {
              if (e.target.value) setLogDate(e.target.value);
            }}
            className="sr-only"
          />
        </label>
      </div>

      <UnifiedDailyPlanList planDate={logDate} />

      {/* Add tasks via source pages */}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/dictate-day"
          className="inline-flex items-center gap-2 rounded-xl border border-kal-border bg-kal-card-muted px-4 py-2.5 text-sm font-bold text-kal-muted transition-colors hover:border-kal-accent/40 hover:text-kal-text"
        >
          <Mic className="h-4 w-4 text-kal-accent" aria-hidden />
          Dictate My Day
        </Link>
        <Link
          href="/self-type-day"
          className="inline-flex items-center gap-2 rounded-xl border border-kal-border bg-kal-card-muted px-4 py-2.5 text-sm font-bold text-kal-muted transition-colors hover:border-kal-accent/40 hover:text-kal-text"
        >
          <Type className="h-4 w-4 text-kal-accent" aria-hidden />
          Self Type
        </Link>
      </div>
    </div>
  );
}
