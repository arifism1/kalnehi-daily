"use client";

import {
  differenceInCalendarDays,
  intervalToDuration,
  startOfDay,
} from "date-fns";
import { useEffect, useMemo, useState } from "react";

import { useTargetExamDate } from "@/hooks/useTargetExamDate";
import { useSettingsStore } from "@/store/useSettingsStore";

function localStartOfExamDay(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

/**
 * Premium exam countdown — dominant day count + disciplined breakdown.
 */
export function ExamCountdownHero() {
  const showCountdown = useSettingsStore((s) => s.showCountdown);
  const { examDate, loading } = useTargetExamDate();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!showCountdown || !examDate) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [showCountdown, examDate]);

  const { months, weeks, days, hours, minutes, seconds, totalDays, past } =
    useMemo(() => {
      void tick;
      if (!examDate) {
        return {
          months: 0,
          weeks: 0,
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          totalDays: 0,
          past: true,
        };
      }
      const now = new Date();
      const examStart = localStartOfExamDay(examDate);
      if (examStart.getTime() <= now.getTime()) {
        return {
          months: 0,
          weeks: 0,
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          totalDays: 0,
          past: true,
        };
      }
      const totalDays = Math.max(
        0,
        differenceInCalendarDays(startOfDay(examStart), startOfDay(now)),
      );
      const d = intervalToDuration({ start: now, end: examStart });
      const months = d.months ?? 0;
      const dayPart = d.days ?? 0;
      const weeks = Math.floor(dayPart / 7);
      const days = dayPart % 7;
      const hours = d.hours ?? 0;
      const minutes = d.minutes ?? 0;
      const seconds = d.seconds ?? 0;
      return {
        months,
        weeks,
        days,
        hours,
        minutes,
        seconds,
        totalDays,
        past: false,
      };
    }, [examDate, tick]);

  if (!showCountdown) return null;

  if (loading) {
    return (
      <div className="px-4 py-8 text-center sm:px-5 sm:py-12">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-kal-accent/30 border-t-kal-accent" />
        <p className="mt-4 text-sm text-kal-muted">Syncing exam clock…</p>
      </div>
    );
  }

  if (!examDate || past) {
    return (
      <div className="px-4 py-8 text-center sm:px-5 sm:py-10">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-kal-muted">
          Exam countdown
        </p>
        <p className="mt-3 text-sm leading-relaxed text-kal-muted">
          Set your target exam date in{" "}
          <span className="font-medium text-kal-accent">Profile</span> to
          arm the clock.
        </p>
      </div>
    );
  }

  const breakdown = [
    { label: "Months", value: months },
    { label: "Weeks", value: weeks },
    { label: "Days", value: days },
    { label: "Hours", value: hours },
  ] as const;

  return (
    <div className="relative overflow-hidden px-6 pb-9 pt-8 sm:px-8 sm:pb-11 sm:pt-9">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(255,122,0,0.12),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(255,122,0,0.18),transparent)]"
        aria-hidden
      />
      <p className="text-center text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-kal-accent">
        Days to exam
      </p>
      <div className="relative mx-auto mt-4 flex max-w-sm flex-col items-center">
        <div
          className="relative flex h-[min(52vw,220px)] w-[min(52vw,220px)] items-center justify-center rounded-full border border-kal-accent/30 bg-kal-card shadow-[0_8px_40px_-12px_rgba(255,122,0,0.25)] backdrop-blur-lg dark:border-kal-accent/25 dark:shadow-[0_0_60px_-12px_rgba(255,122,0,0.40)]"
          aria-live="polite"
        >
          <div
            className="pointer-events-none absolute inset-2 rounded-full border border-kal-border dark:border-white/[0.04]"
            aria-hidden
          />
          <span
            className="bg-gradient-to-br from-kal-text via-kal-text to-kal-accent bg-clip-text text-[clamp(3.5rem,18vw,5.75rem)] font-bold leading-none tabular-nums tracking-tighter text-transparent dark:from-white dark:via-white dark:to-kal-accent/90 dark:drop-shadow-[0_2px_32px_rgba(255,122,0,0.25)]"
          >
            {totalDays}
          </span>
        </div>
        <p className="mt-4 text-center text-xs font-medium uppercase tracking-[0.2em] text-kal-muted">
          Calendar days remaining
        </p>
      </div>

      <div className="mt-7 grid grid-cols-2 gap-3 sm:mt-9 sm:grid-cols-4 sm:gap-4">
        {breakdown.map((b) => (
          <div
            key={b.label}
            className="kal-glass-card rounded-2xl px-3 py-4 text-center transition-colors duration-200 hover:border-kal-accent/30 sm:px-4 sm:py-5"
          >
            <div className="text-2xl font-bold tabular-nums tracking-tight text-kal-text sm:text-[1.65rem] md:text-[1.85rem]">
              {b.value}
            </div>
            <div className="mt-2 text-[11px] font-medium leading-none text-kal-muted sm:text-xs">
              {b.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
