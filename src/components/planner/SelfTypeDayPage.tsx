"use client";

import { addDays, format, parseISO } from "date-fns";
import { ArrowLeft, Home } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { DailyPlanTypedQuickAdd } from "@/components/planner/DailyPlanTypedQuickAdd";
import { UnifiedDailyPlanList } from "@/components/planner/UnifiedDailyPlanList";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { usePlannerDateMidnightRollover } from "@/hooks/usePlannerDateMidnightRollover";
import { dailyPlanLiveHeading, isValidPlanDateString } from "@/lib/dailyPlanUiDate";
import { useAuthStore } from "@/store/useAuthStore";

export function SelfTypeDayPage() {
  const user = useAuthStore((s) => s.user);
  const today = useCalendarDate();
  const searchParams = useSearchParams();
  const rawPlanDate = searchParams.get("planDate") ?? searchParams.get("date");
  const urlPlanDate =
    rawPlanDate && isValidPlanDateString(rawPlanDate) ? rawPlanDate : null;

  const [logDate, setLogDate] = useState(() => urlPlanDate ?? today);
  const [planListKey, bumpPlanList] = useState(0);

  useEffect(() => {
    if (urlPlanDate) setLogDate(urlPlanDate);
  }, [urlPlanDate]);

  usePlannerDateMidnightRollover(today, setLogDate);

  const livePlanTitle = useMemo(
    () => dailyPlanLiveHeading(logDate, today),
    [logDate, today],
  );

  if (!user) {
    return (
      <p className="rounded-xl border border-kal-warn-border bg-kal-warn-soft px-4 py-3 text-sm text-kal-warn-text">
        Sign in to manage your planner.
      </p>
    );
  }

  return (
    <div className="relative mx-auto max-w-2xl pb-16 pt-2 sm:pt-4">
      <div className="flex items-center gap-3 text-sm font-semibold text-kal-accent">
        <Link href="/daily-plan" className="inline-flex items-center gap-1.5 transition hover:text-kal-accent-hover">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Plan hub
        </Link>
        <span className="text-kal-border">|</span>
        <Link href="/" className="inline-flex items-center gap-1.5 transition hover:text-kal-accent-hover">
          <Home className="h-4 w-4" aria-hidden />
          Home
        </Link>
      </div>

      <header className="mt-6 mb-6">
        <p className="kal-category-label text-kal-accent">
          Planning · Typed
        </p>
        <h1 className="kal-feature-title mt-2">
          Type your day
        </h1>
        <p className="kal-feature-lead mt-2 max-w-xl">
          This is the same daily plan as Dictate My Day — one list per date, with typed source badges.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="kal-glass-subtle flex min-h-[44px] items-center gap-1 rounded-xl p-1">
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

      <hr className="mt-6 border-kal-border" />

      <div className="mt-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-kal-muted">
          Today&apos;s plan (live)
        </p>
        <div className="rounded-xl p-4" style={{ backgroundColor: "#FAF8F4" }}>
          <UnifiedDailyPlanList
            key={planListKey}
            planDate={logDate}
            title={livePlanTitle}
          />
        </div>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm text-kal-muted">
        <Link href="/daily-plan" className="font-semibold text-kal-accent hover:text-kal-accent-hover">
          Daily planner
        </Link>
        <span>·</span>
        <Link href="/" className="font-semibold text-kal-accent hover:text-kal-accent-hover">
          Home
        </Link>
        <span>·</span>
        <Link href="/plan-my-day" className="font-semibold text-kal-accent hover:text-kal-accent-hover">
          Plan hub
        </Link>
      </div>
    </div>
  );
}
