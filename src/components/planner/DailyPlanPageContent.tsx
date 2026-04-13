"use client";

import { addDays, format, parseISO } from "date-fns";
import { ArrowLeft, CheckSquare, Mic, PenLine, Type } from "lucide-react";
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
          Today&apos;s focus
        </p>
        <h1 className="mt-2 flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight text-kal-text sm:text-3xl">
          <CheckSquare className="h-8 w-8 text-kal-accent" aria-hidden />
          Daily plan
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-kal-muted">
          Tick off tasks as you go. Voice, typed, and handwritten tasks all appear here together.
        </p>
      </header>

      {/* Date selector */}
      <div className="mb-6 flex min-h-[44px] items-center gap-1 rounded-xl border border-kal-border bg-kal-card-muted p-1 w-fit">
        {[
          { id: format(addDays(parseISO(today), -1), "yyyy-MM-dd"), label: "Yesterday" },
          { id: today, label: "Today" },
          { id: format(addDays(parseISO(today), 1), "yyyy-MM-dd"), label: "Tomorrow" },
        ].map((d) => (
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

      <UnifiedDailyPlanList planDate={logDate} />

      {/* Add tasks via source pages */}
      <div className="mt-6 flex flex-wrap justify-center gap-4">
        <Link
          href="/dictate-day"
          className="inline-flex items-center gap-2 rounded-xl border border-kal-border bg-kal-card-muted px-4 py-2.5 text-sm font-semibold text-kal-muted transition-colors hover:border-kal-accent/40 hover:text-kal-text"
        >
          <Mic className="h-4 w-4 text-kal-accent" aria-hidden />
          Dictate My Day
        </Link>
        <Link
          href="/self-type"
          className="inline-flex items-center gap-2 rounded-xl border border-kal-border bg-kal-card-muted px-4 py-2.5 text-sm font-semibold text-kal-muted transition-colors hover:border-kal-accent/40 hover:text-kal-text"
        >
          <Type className="h-4 w-4 text-kal-accent" aria-hidden />
          Self Type
        </Link>
        <Link
          href="/paste-handwritten"
          className="inline-flex items-center gap-2 rounded-xl border border-kal-border bg-kal-card-muted px-4 py-2.5 text-sm font-semibold text-kal-muted transition-colors hover:border-kal-accent/40 hover:text-kal-text"
        >
          <PenLine className="h-4 w-4 text-kal-accent" aria-hidden />
          Handwritten
        </Link>
      </div>
    </div>
  );
}
