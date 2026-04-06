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

  if (sessions.length === 0) {
    return (
      <section className="rounded-3xl border border-white/[0.07] bg-slate-900/30 p-5 shadow-xl shadow-black/20 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
            <Video className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-violet-400/90">
              Study sessions
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              Add a session from{" "}
              <Link href="/study-sessions" className="text-emerald-400 hover:underline">
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
    <section className="rounded-3xl border border-white/[0.07] bg-slate-900/30 p-5 shadow-xl shadow-black/20 backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
            <Video className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-violet-400/90">
              Study time (7 days)
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-white">
              {formatDur(weekStats.totalSec)}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {weekStats.count} session{weekStats.count === 1 ? "" : "s"} logged ·{" "}
              {format(parseISO(today), "MMM d")} week
            </p>
          </div>
        </div>
        <Link
          href="/daily-log#study-sessions-log"
          className="min-h-[44px] shrink-0 rounded-xl border border-violet-500/30 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-violet-200 hover:bg-violet-500/10"
        >
          Daily log
        </Link>
      </div>
    </section>
  );
}
