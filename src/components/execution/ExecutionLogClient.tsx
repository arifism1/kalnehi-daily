"use client";

import {
  addDays,
  addMonths,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  format,
  isValid,
  parseISO,
  startOfMonth,
} from "date-fns";
import { CalendarRange, ChevronLeft, ChevronRight, ScrollText } from "lucide-react";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useCalendarDate } from "@/hooks/useCalendarDate";
import { refreshExecutionLogFromServer } from "@/lib/refreshExecutionLog";
import { refreshStudySessionsFromServer } from "@/lib/refreshStudySessionsFromServer";
import { getAllStudySessions, type StudySessionLog } from "@/lib/studySessionsIdb";
import { getAllExecutionSessions } from "@/lib/taskIdb";
import type { ExecutionSessionRow } from "@/lib/taskIdb";
import { StudySessionsLog } from "@/components/study/StudySessionsLog";
import { useAuthStore } from "@/store/useAuthStore";
import { useTaskStore } from "@/store/useTaskStore";

type LogView = "daily" | "monthly" | "yearly";

function formatInvested(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

function dayKeyFromEnd(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = parseISO(iso);
  return isValid(d) ? format(d, "yyyy-MM-dd") : null;
}

export function ExecutionLogClient() {
  const userId = useAuthStore((s) => s.user?.id);
  const today = useCalendarDate();
  const tasksRecord = useTaskStore((s) => s.tasks);
  const microRecord = useTaskStore((s) => s.microtopics);

  const [view, setView] = useState<LogView>("daily");
  const [selectedDay, setSelectedDay] = useState(today);
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(parseISO(today)));
  const [yearCursor, setYearCursor] = useState(() =>
    parseISO(`${parseISO(today).getFullYear()}-01-01`),
  );
  const [sessions, setSessions] = useState<ExecutionSessionRow[]>([]);
  const [studySessions, setStudySessions] = useState<StudySessionLog[]>([]);

  const loadLocal = useCallback(async () => {
    const rows = await getAllExecutionSessions();
    rows.sort((a, b) => (b.end_time ?? "").localeCompare(a.end_time ?? ""));
    setSessions(rows);
  }, []);

  const loadStudySessions = useCallback(async () => {
    const rows = await getAllStudySessions();
    setStudySessions(rows);
  }, []);

  useEffect(() => {
    void loadLocal();
  }, [loadLocal]);

  useEffect(() => {
    void loadStudySessions();
  }, [loadStudySessions]);

  useEffect(() => {
    const on = () => void loadLocal();
    window.addEventListener("kalnehi-execution-log-changed", on);
    return () => window.removeEventListener("kalnehi-execution-log-changed", on);
  }, [loadLocal]);

  useEffect(() => {
    const on = () => void loadStudySessions();
    window.addEventListener("kalnehi-study-sessions-changed", on);
    return () =>
      window.removeEventListener("kalnehi-study-sessions-changed", on);
  }, [loadStudySessions]);

  useEffect(() => {
    if (!userId) return;
    void refreshExecutionLogFromServer().then(() => loadLocal());
    void refreshStudySessionsFromServer().then(() => loadStudySessions());
  }, [userId, loadLocal, loadStudySessions]);

  const taskList = useMemo(() => Object.values(tasksRecord), [tasksRecord]);

  const sessionsForDay = useMemo(() => {
    return sessions.filter((s) => dayKeyFromEnd(s.end_time) === selectedDay);
  }, [sessions, selectedDay]);

  const studySessionsForDay = useMemo(() => {
    return studySessions.filter(
      (s) => dayKeyFromEnd(s.ended_at) === selectedDay,
    );
  }, [studySessions, selectedDay]);

  const dayStats = useMemo(() => {
    const total = sessionsForDay.reduce(
      (acc, s) => acc + (s.duration_seconds ?? 0),
      0,
    );
    const taskIds = new Set(sessionsForDay.map((s) => s.task_id));
    const subjects = new Set<string>();
    const chapters = new Set<string>();
    for (const id of taskIds) {
      const t = tasksRecord[id];
      if (!t?.microtopic_id) continue;
      const m = microRecord[t.microtopic_id];
      if (m?.subject) subjects.add(m.subject);
      if (m?.chapter) chapters.add(`${m.subject ?? ""} · ${m.chapter}`);
    }
    const assignedThisDay = taskList.filter((t) => t.assigned_date === selectedDay);
    const completed = assignedThisDay.filter((t) => t.status === "completed").length;
    const denom = assignedThisDay.length;
    const completionPct = denom > 0 ? Math.round((completed / denom) * 100) : null;
    return { total, subjects, chapters, completionPct, completed, denom };
  }, [sessionsForDay, tasksRecord, microRecord, taskList, selectedDay]);

  const monthInterval = useMemo(
    () => ({
      start: startOfMonth(monthCursor),
      end: endOfMonth(monthCursor),
    }),
    [monthCursor],
  );

  const monthlyRows = useMemo(() => {
    const days = eachDayOfInterval(monthInterval);
    return days.map((d) => {
      const key = format(d, "yyyy-MM-dd");
      const daySessions = sessions.filter((s) => dayKeyFromEnd(s.end_time) === key);
      const invested = daySessions.reduce(
        (acc, s) => acc + (s.duration_seconds ?? 0),
        0,
      );
      const assigned = taskList.filter((t) => t.assigned_date === key);
      const done = assigned.filter((t) => t.status === "completed").length;
      const pct = assigned.length > 0 ? Math.round((done / assigned.length) * 100) : null;
      return { key, invested, sessionCount: daySessions.length, completionPct: pct };
    });
  }, [sessions, monthInterval, taskList]);

  const yearlyRows = useMemo(() => {
    const y = format(yearCursor, "yyyy");
    const months = Array.from({ length: 12 }, (_, i) => {
      const start = new Date(Number(y), i, 1);
      const end = endOfMonth(start);
      const interval = { start, end };
      const keys = eachDayOfInterval(interval).map((d) => format(d, "yyyy-MM-dd"));
      let invested = 0;
      let sessionsCount = 0;
      const keySet = new Set(keys);
      for (const s of sessions) {
        const k = dayKeyFromEnd(s.end_time);
        if (k && keySet.has(k)) {
          invested += s.duration_seconds ?? 0;
          sessionsCount += 1;
        }
      }
      const ym = `${y}-${String(i + 1).padStart(2, "0")}`;
      const assigned = taskList.filter((t) => t.assigned_date.startsWith(ym));
      const done = assigned.filter((t) => t.status === "completed").length;
      const pct = assigned.length > 0 ? Math.round((done / assigned.length) * 100) : null;
      return {
        label: format(start, "MMMM"),
        invested,
        sessionsCount,
        completionPct: pct,
      };
    });
    return months;
  }, [sessions, yearCursor, taskList]);

  const tabCls = (active: boolean) =>
    `min-h-[44px] flex-1 rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors ${
      active
        ? "bg-kal-accent text-kal-accent-foreground shadow-sm"
        : "text-kal-muted hover:text-kal-text"
    }`;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
            Execution log
          </p>
          <h1 className="kal-feature-title mt-1 flex items-center gap-2">
            <ScrollText className="size-7 text-kal-accent" aria-hidden />
            Daily mastery record
          </h1>
          <p className="kal-feature-lead mt-2 max-w-xl">
            Time invested in high-yield topics — every ended session and conquered
            target, synced offline-first across months and years.
          </p>
        </div>
      </header>

      <div className="flex gap-1.5 rounded-2xl bg-kal-card-muted p-1.5 ring-1 ring-kal-border">
        <button
          type="button"
          className={tabCls(view === "daily")}
          onClick={() => setView("daily")}
        >
          Daily
        </button>
        <button
          type="button"
          className={tabCls(view === "monthly")}
          onClick={() => setView("monthly")}
        >
          Monthly
        </button>
        <button
          type="button"
          className={tabCls(view === "yearly")}
          onClick={() => setView("yearly")}
        >
          Yearly
        </button>
      </div>

      {view === "daily" && (
        <section className="rounded-3xl border border-kal-border bg-kal-card p-6 kal-shadow-card sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-kal-text">Day detail</h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous day"
                className="rounded-xl p-2 text-kal-muted hover:bg-kal-card hover:text-kal-text"
                onClick={() =>
                  setSelectedDay(format(addDays(parseISO(selectedDay), -1), "yyyy-MM-dd"))
                }
              >
                <ChevronLeft className="size-5" />
              </button>
              <span className="min-w-[10rem] text-center text-sm font-semibold tabular-nums text-kal-accent/90">
                {selectedDay}
              </span>
              <button
                type="button"
                aria-label="Next day"
                className="rounded-xl p-2 text-kal-muted hover:bg-kal-card hover:text-kal-text"
                onClick={() =>
                  setSelectedDay(format(addDays(parseISO(selectedDay), 1), "yyyy-MM-dd"))
                }
              >
                <ChevronRight className="size-5" />
              </button>
              <button
                type="button"
                className="ml-2 min-w-[3.25rem] shrink-0 whitespace-nowrap rounded-xl border border-kal-accent/30 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-kal-accent hover:bg-kal-accent/10"
                onClick={() => setSelectedDay(today)}
              >
                Today
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-kal-border bg-kal-card-muted px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-kal-muted">
                Time invested
              </p>
              <p className="mt-1 text-lg font-bold tabular-nums text-kal-accent">
                {formatInvested(dayStats.total)}
              </p>
            </div>
            <div className="rounded-2xl border border-kal-border bg-kal-card-muted px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-kal-muted">
                Sessions logged
              </p>
              <p className="mt-1 text-lg font-bold text-kal-text">{sessionsForDay.length}</p>
            </div>
            <div className="rounded-2xl border border-kal-border bg-kal-card-muted px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-kal-muted">
                Day completion
              </p>
              <p className="mt-1 text-lg font-bold text-kal-text">
                {dayStats.completionPct != null
                  ? `${dayStats.completionPct}% (${dayStats.completed}/${dayStats.denom})`
                  : "—"}
              </p>
            </div>
          </div>

          {(dayStats.subjects.size > 0 || dayStats.chapters.size > 0) && (
            <div className="mt-4 rounded-2xl border border-kal-accent/20 bg-kal-accent-soft/30 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-kal-accent">
                High-yield coverage
              </p>
              <p className="mt-2 text-xs text-kal-text-secondary/80">
                {Array.from(dayStats.subjects).join(" · ") || "—"}
              </p>
              {dayStats.chapters.size > 0 && (
                <ul className="mt-2 space-y-1 text-[11px] text-kal-muted">
                  {Array.from(dayStats.chapters).slice(0, 12).map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <ul className="mt-6 space-y-2">
            {sessionsForDay.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-kal-border py-12 text-center text-sm text-kal-muted">
                No execution sessions for this day yet - start one focused timer
                to build your mastery record.
              </li>
            ) : (
              sessionsForDay.map((s) => {
                const t = tasksRecord[s.task_id];
                const m = t?.microtopic_id ? microRecord[t.microtopic_id] : null;
                const title =
                  t?.name?.trim() || m?.microtopic || "Target";
                return (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-kal-border bg-kal-card-muted px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-kal-text">{title}</p>
                      <p className="text-[11px] text-kal-muted">
                        {m?.subject}
                        {m?.chapter ? ` · ${m.chapter}` : ""}
                        {s.end_time && (
                          <span className="ml-2 tabular-nums text-kal-text-secondary">
                            {format(parseISO(s.end_time), "HH:mm")}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-kal-accent/90">
                      {formatInvested(s.duration_seconds ?? 0)}
                    </span>
                  </li>
                );
              })
            )}
          </ul>

          <div
            id="study-sessions-log"
            className="mt-8 border-t border-kal-border pt-8 scroll-mt-24"
          >
            <h3 className="text-sm font-semibold text-kal-text">Study sessions</h3>
            <p className="mt-1 text-xs leading-relaxed text-kal-muted">
              Logged study sessions for this day.
            </p>
            <ul className="mt-4 space-y-2">
              <StudySessionsLog
                sessions={studySessionsForDay}
                emptyMessage="No study sessions for this day yet - add one to keep your streak moving."
              />
            </ul>
          </div>
        </section>
      )}

      {view === "monthly" && (
        <section className="rounded-3xl border border-kal-border bg-kal-card p-6 kal-shadow-card sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-kal-text">
              <CalendarRange className="size-4 text-kal-accent" aria-hidden />
              Monthly rollup
            </h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="rounded-xl p-2 text-kal-muted hover:bg-kal-card-muted"
                onClick={() => setMonthCursor((d) => addMonths(d, -1))}
                aria-label="Previous month"
              >
                <ChevronLeft className="size-5" />
              </button>
              <span className="min-w-[8rem] text-center text-sm font-semibold text-kal-accent/90">
                {format(monthCursor, "MMMM yyyy")}
              </span>
              <button
                type="button"
                className="rounded-xl p-2 text-kal-muted hover:bg-kal-card-muted"
                onClick={() => setMonthCursor((d) => addMonths(d, 1))}
                aria-label="Next month"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          </div>
          <ul className="mt-4 max-h-[min(70vh,520px)] space-y-1 overflow-y-auto pr-1">
            {monthlyRows.map((row) => (
              <li
                key={row.key}
                className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-xl border border-kal-border bg-kal-card-muted px-3 py-2.5 text-sm"
              >
                <span className="min-w-0 tabular-nums text-kal-text-secondary">{row.key}</span>
                <span className="min-w-0 text-xs text-kal-muted">
                  {row.sessionCount} sessions
                  {row.completionPct != null ? ` · ${row.completionPct}% done` : ""}
                </span>
                <span className="min-w-0 font-semibold tabular-nums text-kal-accent">
                  {formatInvested(row.invested)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view === "yearly" && (
        <section className="rounded-3xl border border-kal-border bg-kal-card p-6 kal-shadow-card sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-kal-text">Yearly arc</h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="rounded-xl p-2 text-kal-muted hover:bg-kal-card-muted"
                onClick={() => setYearCursor((d) => addYears(d, -1))}
                aria-label="Previous year"
              >
                <ChevronLeft className="size-5" />
              </button>
              <span className="min-w-[4rem] text-center text-sm font-semibold text-kal-accent/90">
                {format(yearCursor, "yyyy")}
              </span>
              <button
                type="button"
                className="rounded-xl p-2 text-kal-muted hover:bg-kal-card-muted"
                onClick={() => setYearCursor((d) => addYears(d, 1))}
                aria-label="Next year"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {yearlyRows.map((row) => (
              <li
                key={row.label}
                className="rounded-2xl border border-kal-border bg-kal-card-muted px-4 py-3"
              >
                <p className="text-xs font-bold text-kal-text">{row.label}</p>
                <p className="mt-2 text-lg font-bold tabular-nums text-kal-accent">
                  {formatInvested(row.invested)}
                </p>
                <p className="mt-1 text-[11px] text-kal-muted">
                  {row.sessionsCount} sessions
                  {row.completionPct != null ? ` · ${row.completionPct}% targets` : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
