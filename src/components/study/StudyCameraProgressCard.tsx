"use client";

import { format, parseISO, subDays } from "date-fns";
import { Video } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getAllStudySessions,
  type StudySessionLog,
} from "@/lib/studySessionsIdb";
import { useCalendarDate } from "@/hooks/useCalendarDate";

function formatDur(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

export function StudyCameraProgressCard() {
  const today = useCalendarDate();
  const [sessions, setSessions] = useState<StudySessionLog[]>([]);

  const load = useCallback(async () => {
    const rows = await getAllStudySessions();
    setSessions(rows);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const on = () => void load();
    window.addEventListener("kalnehi-study-sessions-changed", on);
    return () => window.removeEventListener("kalnehi-study-sessions-changed", on);
  }, [load]);

  const weekStats = useMemo(() => {
    const startStr = format(subDays(parseISO(today), 6), "yyyy-MM-dd");
    let totalSec = 0;
    let count = 0;
    for (const s of sessions) {
      const dayKey = format(parseISO(s.ended_at), "yyyy-MM-dd");
      if (dayKey >= startStr && dayKey <= today) {
        totalSec += s.duration_seconds;
        count += 1;
      }
    }
    return { totalSec, count };
  }, [sessions, today]);

  const shell = "kal-glass-panel rounded-2xl p-5 sm:p-6";

  if (sessions.length === 0) {
    return (
      <section className={shell}>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/60 text-kal-accent shadow-sm backdrop-blur-sm dark:border-white/12 dark:bg-zinc-900/60">
            <Video className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
              Study sessions
            </p>
            <p className="mt-1 text-sm leading-relaxed text-kal-text-secondary">
              Add a session from{" "}
              <Link href="/study-sessions" className="font-medium text-kal-accent underline-offset-2 hover:underline">
                Study sessions
              </Link>{" "}
              to see time here and in Daily Log.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={shell}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/60 text-kal-accent shadow-sm backdrop-blur-sm dark:border-white/12 dark:bg-zinc-900/60">
            <Video className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
              Study time (7 days)
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-kal-text sm:text-xl">
              {formatDur(weekStats.totalSec)}
            </p>
            <p className="mt-0.5 text-xs text-kal-text-secondary">
              {weekStats.count} session{weekStats.count === 1 ? "" : "s"} logged ·{" "}
              {format(parseISO(today), "MMM d")} week
            </p>
          </div>
        </div>
        <Link
          href="/daily-debrief#study-sessions-log"
          className="kal-glass-subtle inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-kal-text transition-colors hover:border-kal-accent/35 hover:opacity-95 dark:hover:text-kal-text"
        >
          Daily log
        </Link>
      </div>
    </section>
  );
}
