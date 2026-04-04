"use client";

import {
  differenceInCalendarDays,
  intervalToDuration,
  startOfDay,
} from "date-fns";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";

import { useTargetExamDate } from "@/hooks/useTargetExamDate";
import { useSettingsStore } from "@/store/useSettingsStore";

function localStartOfExamDay(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

export function FinalCountdown() {
  const showCountdown = useSettingsStore((s) => s.showCountdown);
  const { examDate, loading } = useTargetExamDate();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!showCountdown || !examDate) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, [showCountdown, examDate]);

  const { months, weeks, days, hours, totalDays, past } = useMemo(() => {
    void tick;
    if (!examDate) {
      return {
        months: 0,
        weeks: 0,
        days: 0,
        hours: 0,
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
    return { months, weeks, days, hours, totalDays, past: false };
  }, [examDate, tick]);

  if (!showCountdown) return null;
  if (loading || !examDate) return null;

  if (past) {
    return (
      <section className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 text-sm text-zinc-400">
        Set your target exam date in Profile to see the countdown.
      </section>
    );
  }

  const boxes = [
    { label: "Months", value: months },
    { label: "Weeks", value: weeks },
    { label: "Days", value: days },
    { label: "Hours", value: hours },
  ];

  return (
    <section
      aria-label="Exam countdown"
      className="overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/80 to-slate-900 p-4 shadow-lg shadow-emerald-900/20"
    >
      <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-emerald-400/90">
        Final countdown
      </p>
      <p className="mt-1 text-xs text-zinc-400">
        {totalDays} calendar days · exam ahead
      </p>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {boxes.map((b) => (
          <div
            key={b.label}
            className={clsx(
              "rounded-xl px-2 py-3 text-center ring-1 ring-emerald-500/25",
              "bg-emerald-950/40",
            )}
          >
            <div className="text-xl font-bold tabular-nums text-emerald-300">
              {b.value}
            </div>
            <div className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              {b.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
