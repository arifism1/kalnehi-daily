"use client";

import { addDays, format, parse, parseISO } from "date-fns";
import { ArrowLeft, CalendarDays, Mic, Type, Zap } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, useEffect } from "react";

import { ShareYourDayCard } from "@/components/daily/ShareYourDayCard";
import { EndOfDayNudgeFlow } from "@/components/planner/EndOfDayNudgeFlow";
import { TaskInputModal, type TaskInputMode } from "@/components/planner/TaskInputModal";
import { UnifiedDailyPlanList } from "@/components/planner/UnifiedDailyPlanList";
import { DailyReflectionClient } from "@/components/reflection/DailyReflectionClient";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { usePlannerDateMidnightRollover } from "@/hooks/usePlannerDateMidnightRollover";
import {
  dailyPlanLiveHeading,
  dailyPlanPageHeroTitle,
  isValidPlanDateString,
} from "@/lib/dailyPlanUiDate";
import {
  VOICE_PLAN_HINT_KEY,
  type VoicePlanHintV1,
} from "@/lib/voiceBossModeHints";
import { useAuthStore } from "@/store/useAuthStore";

export function DailyPlanPageContent() {
  const user = useAuthStore((s) => s.user);
  const today = useCalendarDate();
  const searchParams = useSearchParams();
  const rawPlanDate = searchParams.get("planDate") ?? searchParams.get("date");
  const urlPlanDate =
    rawPlanDate && isValidPlanDateString(rawPlanDate) ? rawPlanDate : null;
  const [logDate, setLogDate] = useState(() => urlPlanDate ?? today);

  const openParam = searchParams.get("open");
  const initialMode: TaskInputMode | null =
    openParam === "dictate" ? "dictate" : openParam === "self-type" ? "self-type" : null;
  const [modalMode, setModalMode] = useState<TaskInputMode | null>(initialMode);
  const [voicePlanBanner, setVoicePlanBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!urlPlanDate) return;
    const id = window.setTimeout(() => {
      setLogDate(urlPlanDate);
    }, 0);
    return () => window.clearTimeout(id);
  }, [urlPlanDate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(VOICE_PLAN_HINT_KEY);
    if (!raw) return;
    sessionStorage.removeItem(VOICE_PLAN_HINT_KEY);
    try {
      const hint = JSON.parse(raw) as VoicePlanHintV1;
      if (hint.v !== 1) return;
      const hydrateId = window.setTimeout(() => {
        setLogDate(hint.target_date);
        setVoicePlanBanner(
          `Couldn't find “${hint.task_name}”. Search your plan below.`,
        );
      }, 0);
      const bannerId = window.setTimeout(() => setVoicePlanBanner(null), 12_000);
      return () => {
        window.clearTimeout(hydrateId);
        window.clearTimeout(bannerId);
      };
    } catch {
      // ignore
    }
  }, []);

  usePlannerDateMidnightRollover(today, setLogDate);

  const heroTitle = useMemo(
    () => dailyPlanPageHeroTitle(logDate, today),
    [logDate, today],
  );
  const listTitle = useMemo(
    () => dailyPlanLiveHeading(logDate, today),
    [logDate, today],
  );

  if (!user) {
    return (
      <p className="mx-auto max-w-lg rounded-xl border border-kal-warn-border bg-kal-warn-soft px-4 py-3 text-sm text-kal-warn-text">
        Sign in to view your daily plan.
      </p>
    );
  }

  // Use parse (local midnight) not parseISO (UTC midnight) so that chip ids
  // for Yesterday/Tomorrow are correct in non-UTC timezones.
  const todayLocal = parse(today, "yyyy-MM-dd", new Date());
  const DATE_CHIPS = [
    { id: today, label: "Today" },
    { id: format(addDays(todayLocal, -1), "yyyy-MM-dd"), label: "Yesterday" },
    { id: format(addDays(todayLocal, 1), "yyyy-MM-dd"), label: "Tomorrow" },
  ];

  const isChipDate = DATE_CHIPS.some((d) => d.id === logDate);

  return (
    <div className="relative mx-auto max-w-2xl pb-16 pt-2 sm:pt-4">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-kal-accent hover:text-kal-accent-hover"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Home
      </Link>

      <header className="mt-6 mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <Zap className="size-5 text-kal-accent" aria-hidden />
          <h1 className="kal-feature-title">{heroTitle}</h1>
        </div>
      </header>

      {/* Date chips + date picker + input action buttons */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex min-h-[36px] items-center gap-1 rounded-xl border border-kal-border bg-kal-card-muted p-1">
          {DATE_CHIPS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setLogDate(d.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
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
        <label className="flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-xl border border-kal-border bg-kal-card-muted px-3 py-1 text-xs font-semibold text-kal-muted transition-colors hover:text-kal-text">
          <CalendarDays className="size-3.5 text-kal-accent" aria-hidden />
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

        {/* Input mode buttons */}
        <button
          type="button"
          onClick={() => setModalMode("dictate")}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-kal-border bg-kal-card-muted px-3 py-1 text-xs font-semibold text-kal-muted transition-colors hover:border-kal-accent/40 hover:text-kal-text"
        >
          <Mic className="size-3.5 text-kal-accent" aria-hidden />
          Dictate
        </button>
        <button
          type="button"
          onClick={() => setModalMode("self-type")}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-kal-border bg-kal-card-muted px-3 py-1 text-xs font-semibold text-kal-muted transition-colors hover:border-kal-accent/40 hover:text-kal-text"
        >
          <Type className="size-3.5 text-kal-accent" aria-hidden />
          Self Type
        </button>
      </div>

      {voicePlanBanner ? (
        <p
          role="status"
          className="mb-4 rounded-xl border border-amber-500/35 bg-amber-500/[0.08] px-3 py-2 text-sm text-amber-950 dark:border-amber-500/25 dark:bg-amber-950/20 dark:text-amber-100/90"
        >
          {voicePlanBanner}
        </p>
      ) : null}

      <UnifiedDailyPlanList
        planDate={logDate}
        title={listTitle}
        showScheduleRevision
      />

      {logDate === today ? (
        <EndOfDayNudgeFlow planDate={logDate} todayCalendar={today} />
      ) : null}

      <div className="mt-6">
        <ShareYourDayCard />
      </div>

      <FeatureGate feature="daily_log">
        {logDate === today ? (
          <div className="mt-6">
            <DailyReflectionClient collapsible />
          </div>
        ) : null}
      </FeatureGate>

      <TaskInputModal
        mode={modalMode}
        planDate={logDate}
        onClose={() => setModalMode(null)}
      />
    </div>
  );
}
