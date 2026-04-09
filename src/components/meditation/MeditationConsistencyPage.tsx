"use client";

import { format } from "date-fns";
import { CalendarDays, ChevronDown, Flame, Timer } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  computeMeditationStreak,
  getMeditationSessions,
} from "@/lib/meditationLocal";
import { flushMeditationOutbox, refreshMeditationFromServer } from "@/lib/meditationSync";
import { MEDITATION_TYPES, type MeditationSessionRow } from "@/lib/meditationTypes";
import { useAuthStore } from "@/store/useAuthStore";

function sumSeconds(rows: MeditationSessionRow[]): number {
  return rows.reduce((s, r) => s + r.duration_seconds, 0);
}

function fmt(total: number): string {
  const s = Math.max(0, Math.floor(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m`;
}

export function MeditationConsistencyPage() {
  const userId = useAuthStore((s) => s.user?.id);
  const [rows, setRows] = useState<MeditationSessionRow[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(
    () => new Set([new Date().getMonth()]),
  );

  const year = new Date().getFullYear();
  const monthPrefix = format(new Date(), "yyyy-MM");
  const today = format(new Date(), "yyyy-MM-dd");

  const load = useCallback(async () => {
    if (!userId) return;
    setRows(await getMeditationSessions(userId));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void (async () => {
      await load();
      await flushMeditationOutbox(userId);
      await refreshMeditationFromServer(userId);
      await load();
    })();
    const on = () => void load();
    window.addEventListener("kalnehi-meditation-changed", on);
    return () => window.removeEventListener("kalnehi-meditation-changed", on);
  }, [load, userId]);

  const yearRows = useMemo(() => rows.filter((r) => r.date.startsWith(String(year))), [rows, year]);
  const monthRows = useMemo(() => rows.filter((r) => r.date.startsWith(monthPrefix)), [rows, monthPrefix]);
  const todayRows = useMemo(() => rows.filter((r) => r.date === today), [rows, today]);
  const streak = useMemo(() => computeMeditationStreak(rows, today), [rows, today]);

  const byDate = useMemo(() => {
    const m = new Map<string, MeditationSessionRow[]>();
    for (const r of yearRows) {
      const arr = m.get(r.date) ?? [];
      arr.push(r);
      m.set(r.date, arr);
    }
    return m;
  }, [yearRows]);

  const minMinutesByType = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of MEDITATION_TYPES) {
      map.set(t.id, t.durationRangeMinutes[0]);
    }
    return map;
  }, []);

  const dayStatus = useCallback(
    (dateKey: string): "future" | "none" | "partial" | "complete" => {
      if (dateKey > today) return "future";
      const sessions = byDate.get(dateKey) ?? [];
      if (sessions.length === 0) return "none";
      const hasPartial = sessions.some((s) => {
        const min = minMinutesByType.get(s.session_type) ?? 1;
        return s.duration_minutes < min;
      });
      return hasPartial ? "partial" : "complete";
    },
    [byDate, minMinutesByType, today],
  );

  const selectedRows = useMemo(
    () => (selectedDate ? (byDate.get(selectedDate) ?? []) : []),
    [byDate, selectedDate],
  );

  const months = useMemo(() => {
    const all: Array<{
      label: string;
      days: Array<{
        key: string;
        day: number;
        status: "future" | "none" | "partial" | "complete";
      }>;
    }> = [];
    for (let m = 0; m < 12; m += 1) {
      const first = new Date(year, m, 1);
      const last = new Date(year, m + 1, 0);
      const days = Array.from({ length: last.getDate() }, (_, i) => {
        const d = format(new Date(year, m, i + 1), "yyyy-MM-dd");
        const status = dayStatus(d);
        return { key: d, day: i + 1, status };
      });
      all.push({ label: format(first, "MMMM"), days });
    }
    return all;
  }, [byDate, dayStatus, year]);

  if (!userId) {
    return <div className="rounded-2xl border border-kal-border bg-kal-card p-6">Sign in to view consistency.</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <header className="rounded-3xl border border-kal-border bg-gradient-to-br from-[#f2f9f6] via-kal-card to-[#eef6ff] p-7">
        <p className="text-[0.68rem] uppercase tracking-[0.22em] text-kal-accent">Mind training</p>
        <h1 className="mt-2 text-3xl font-bold text-kal-text">Meditation Consistency</h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-kal-border bg-kal-card p-5">
          <p className="text-xs uppercase tracking-wide text-kal-muted">This year</p>
          <p className="mt-2 text-2xl font-bold text-kal-text">{fmt(sumSeconds(yearRows))}</p>
        </div>
        <div className="rounded-2xl border border-kal-border bg-kal-card p-5">
          <p className="text-xs uppercase tracking-wide text-kal-muted">This month</p>
          <p className="mt-2 text-2xl font-bold text-kal-text">{fmt(sumSeconds(monthRows))}</p>
        </div>
        <div className="rounded-2xl border border-kal-border bg-kal-card p-5">
          <p className="text-xs uppercase tracking-wide text-kal-muted">Today</p>
          <p className="mt-2 text-2xl font-bold text-kal-text">{fmt(sumSeconds(todayRows))}</p>
        </div>
        <div className="rounded-2xl border border-kal-border bg-kal-card p-5">
          <p className="text-xs uppercase tracking-wide text-kal-muted">Current streak</p>
          <p className="mt-2 inline-flex items-center gap-2 text-2xl font-bold text-kal-text">
            <Flame className="h-5 w-5 text-kal-accent" />
            {streak} days
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-kal-border bg-kal-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-kal-accent" />
          <h2 className="text-sm font-semibold text-kal-text">{year} Calendar</h2>
        </div>
        <div className="space-y-4">
          {months.map((m, monthIndex) => (
            <div key={m.label} className="min-w-[22rem]">
              <button
                type="button"
                onClick={() =>
                  setExpandedMonths((prev) => {
                    const next = new Set(prev);
                    if (next.has(monthIndex)) next.delete(monthIndex);
                    else next.add(monthIndex);
                    return next;
                  })
                }
                className="mb-2 flex w-full items-center justify-between rounded-xl border border-kal-border bg-kal-page px-3 py-2 text-left"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-kal-muted">
                  {m.label}
                </p>
                <ChevronDown
                  className={`h-4 w-4 text-kal-muted transition-transform ${
                    expandedMonths.has(monthIndex) ? "rotate-180" : ""
                  }`}
                />
              </button>
              {expandedMonths.has(monthIndex) ? (
                <div className="grid grid-cols-7 gap-2">
                  {m.days.map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setSelectedDate(d.key)}
                      className={`h-9 rounded-lg text-sm ${
                        d.status === "future"
                          ? "bg-kal-card-muted text-kal-muted"
                          : d.status === "none"
                          ? "bg-red-100 text-red-700"
                          : d.status === "partial"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-emerald-500 text-white"
                      }`}
                    >
                      {d.day}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-kal-border bg-kal-card p-5">
        <h3 className="text-sm font-semibold text-kal-text">
          {selectedDate ? `Daily breakdown · ${selectedDate}` : "Daily breakdown"}
        </h3>
        {!selectedDate ? (
          <p className="mt-2 text-sm text-kal-muted">Tap a date in the calendar to view minutes and notes.</p>
        ) : selectedRows.length === 0 ? (
          <p className="mt-2 text-sm text-kal-muted">No meditation logged for this date.</p>
        ) : (
          <div className="mt-3 space-y-2">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-kal-text">
              <Timer className="h-4 w-4 text-kal-accent" />
              Total: {fmt(sumSeconds(selectedRows))}
            </p>
            <ul className="space-y-2">
              {selectedRows.map((r) => (
                <li key={r.id} className="rounded-xl border border-kal-border bg-kal-page p-3 text-sm">
                  <p className="font-medium text-kal-text">
                    {MEDITATION_TYPES.find((t) => t.id === r.session_type)?.title ?? r.session_type}
                  </p>
                  <p className="mt-1 text-kal-muted">{Math.max(1, r.duration_minutes)} min</p>
                  {r.notes ? <p className="mt-1 text-kal-text-secondary">{r.notes}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
