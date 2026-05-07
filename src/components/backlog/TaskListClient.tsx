"use client";

import { addDays, format, parseISO } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  TaskListBacklogRow,
  TaskListPlannedRow,
} from "@/actions/backlogRecovery";
import {
  fetchTaskListPayload,
  rolloverMissedBacklogRecoveryTasks,
  updateRecoveryPlannedTask,
} from "@/actions/backlogRecovery";
import {
  BACKLOG_TRACKER_PREFILL_KEY,
  type BacklogTrackerPrefillV1,
} from "@/lib/backlogRecoveryConstants";
import { useCalendarDate } from "@/hooks/useCalendarDate";

const PLANNED_FIX_VISIBLE_DAYS = 14;

type PlannedWindow = { fromYmd: string; toYmd: string };

function defaultPlannedWindow(anchorYmd: string): PlannedWindow {
  return {
    fromYmd: format(addDays(parseISO(`${anchorYmd}T12:00:00`), -1), "yyyy-MM-dd"),
    toYmd: format(addDays(parseISO(`${anchorYmd}T12:00:00`), 30), "yyyy-MM-dd"),
  };
}

function monthWindow(yyyyMm: string): PlannedWindow | null {
  const m = /^(\d{4})-(\d{2})$/.exec(yyyyMm.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12 || !Number.isFinite(y)) return null;
  const start = new Date(y, mo - 1, 1);
  const end = new Date(y, mo, 0);
  return {
    fromYmd: format(start, "yyyy-MM-dd"),
    toYmd: format(end, "yyyy-MM-dd"),
  };
}

function formatDayLabel(ymd: string, today: string): string {
  if (ymd === today) return "Today";
  const tomorrow = format(addDays(parseISO(`${today}T12:00:00`), 1), "yyyy-MM-dd");
  if (ymd === tomorrow) return "Tomorrow";
  try {
    return format(parseISO(`${ymd}T12:00:00`), "MMM d");
  } catch {
    return ymd;
  }
}

type Props = {
  initialUnplanned: TaskListBacklogRow[];
  initialUnplannedTotal: number;
  initialPlannedByDate: Record<string, TaskListPlannedRow[]>;
  initialServerTodayYmd: string;
  initialPlannedWindow: PlannedWindow;
};

export function TaskListClient({
  initialUnplanned,
  initialUnplannedTotal,
  initialPlannedByDate,
  initialServerTodayYmd,
  initialPlannedWindow,
}: Props) {
  const router = useRouter();
  const today = useCalendarDate();
  const [unplanned, setUnplanned] = useState(initialUnplanned);
  const [unplannedTotal, setUnplannedTotal] = useState(initialUnplannedTotal);
  const [plannedByDate, setPlannedByDate] = useState(initialPlannedByDate);
  const [plannedWindow, setPlannedWindow] = useState(initialPlannedWindow);
  const [showMoreDays, setShowMoreDays] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);

  const [editRow, setEditRow] = useState<TaskListPlannedRow | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMinutes, setEditMinutes] = useState("");
  const [editPlanDate, setEditPlanDate] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    void rolloverMissedBacklogRecoveryTasks(today);
  }, [today]);

  const refresh = useCallback(async (nextWindow?: PlannedWindow) => {
    const w = nextWindow ?? plannedWindow;
    const res = await fetchTaskListPayload({
      plannedFromYmd: w.fromYmd,
      plannedToYmd: w.toYmd,
    });
    if (!res.ok) return;
    setPlannedWindow(res.plannedWindow);
    setUnplanned(res.unplanned);
    setUnplannedTotal(res.unplannedTotal);
    setPlannedByDate(res.plannedByDate);
  }, [plannedWindow]);

  const openPlannedEdit = useCallback((row: TaskListPlannedRow) => {
    setEditRow(row);
    setEditTitle(row.title);
    setEditMinutes(
      row.estimated_minutes != null ? String(row.estimated_minutes) : "",
    );
    setEditPlanDate(row.plan_date.slice(0, 10));
    setEditError(null);
  }, []);

  const closePlannedEdit = useCallback(() => {
    if (editBusy) return;
    setEditRow(null);
    setEditError(null);
  }, [editBusy]);

  const savePlannedEdit = useCallback(async () => {
    if (!editRow) return;
    const title = editTitle.trim();
    if (!title) {
      setEditError("Add a title.");
      return;
    }
    let minutes: number | null;
    const rawM = editMinutes.trim();
    if (rawM === "") {
      minutes = null;
    } else {
      const n = Number(rawM);
      if (!Number.isFinite(n) || n < 0) {
        setEditError("Minutes must be a non-negative number.");
        return;
      }
      minutes = Math.round(n);
    }
    const date = editPlanDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setEditError("Pick a valid date.");
      return;
    }
    setEditBusy(true);
    setEditError(null);
    try {
      const res = await updateRecoveryPlannedTask({
        daily_task_id: editRow.task_id,
        title,
        estimated_minutes: minutes,
        target_plan_date: date,
      });
      if (!res.ok) {
        setEditError(res.error);
        return;
      }
      await refresh();
      router.refresh();
      setEditRow(null);
    } finally {
      setEditBusy(false);
    }
  }, [
    editRow,
    editTitle,
    editMinutes,
    editPlanDate,
    refresh,
    router,
  ]);

  const plannedByDateFiltered = useMemo(() => {
    if (!subjectFilter) return plannedByDate;
    const out: Record<string, TaskListPlannedRow[]> = {};
    for (const [d, rows] of Object.entries(plannedByDate)) {
      const filtered = rows.filter(
        (t) => (t.group_label?.trim() ?? "") === subjectFilter,
      );
      if (filtered.length > 0) out[d] = filtered;
    }
    return out;
  }, [plannedByDate, subjectFilter]);

  const sortedPlanDates = useMemo(() => {
    return Object.keys(plannedByDateFiltered)
      .filter((d) => (plannedByDateFiltered[d]?.length ?? 0) > 0)
      .sort();
  }, [plannedByDateFiltered]);

  const agendaDates = useMemo(() => {
    const future = sortedPlanDates.filter((d) => d >= today);
    return showMoreDays ? future : future.slice(0, PLANNED_FIX_VISIBLE_DAYS);
  }, [sortedPlanDates, today, showMoreDays]);

  const subjectOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of unplanned) {
      const g = r.group_label?.trim();
      if (g) set.add(g);
    }
    for (const rows of Object.values(plannedByDate)) {
      for (const t of rows) {
        const g = t.group_label?.trim();
        if (g) set.add(g);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [unplanned, plannedByDate]);

  const filteredUnplanned = useMemo(() => {
    if (!subjectFilter) return unplanned;
    return unplanned.filter((r) => (r.group_label?.trim() ?? "") === subjectFilter);
  }, [unplanned, subjectFilter]);

  const openTracker = (ids: string[], titles: string[] | undefined, loadExistingRows: boolean) => {
    const payload: BacklogTrackerPrefillV1 = {
      v: 1,
      backlog_ids: ids,
      titles,
      load_existing_rows: loadExistingRows,
    };
    sessionStorage.setItem(BACKLOG_TRACKER_PREFILL_KEY, JSON.stringify(payload));
    router.push("/backlog-tracker");
  };

  const visibleUnplanned = filteredUnplanned.slice(0, 5);
  const hiddenUnplanned = subjectFilter
    ? Math.max(0, filteredUnplanned.length - visibleUnplanned.length)
    : Math.max(0, unplannedTotal - visibleUnplanned.length);

  const unplannedHeadingCount = subjectFilter ? filteredUnplanned.length : unplannedTotal;

  const missedTodayLabel = (row: TaskListBacklogRow) =>
    row.last_attempt_date === today || row.last_attempt_date === initialServerTodayYmd
      ? "Missed today"
      : null;

  return (
    <div className="mx-auto max-w-lg space-y-8 pb-20">
      <header className="space-y-3">
        <div>
          <p className="kal-category-label text-kal-accent">Backlog List</p>
          <h1 className="kal-feature-title mt-1">Backlog List</h1>
          <p className="mt-1 text-sm text-kal-muted">
            See what&apos;s scheduled, plan from pending rows, and reopen items in Backlog Tracker.
            Nothing pending is buried.
          </p>
        </div>
        <Link
          href="/backlog-tracker"
          className="inline-flex w-full items-center justify-center rounded-xl bg-kal-accent py-3 text-sm font-bold text-kal-accent-foreground sm:w-auto sm:px-6"
        >
          Add new backlog — Backlog Tracker
        </Link>
      </header>

      {/* Planned Fix — dominant */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-bold text-kal-text">Planned Fix</h2>
          <span className="text-[11px] font-medium text-kal-muted">Already scheduled</span>
        </div>
        <p className="text-xs text-kal-muted">Your backlog is already being handled.</p>

        <div className="flex flex-col gap-3 rounded-xl border border-kal-border/60 bg-kal-card-muted/30 p-3 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex min-w-[8rem] flex-col gap-1 text-[11px] font-semibold text-kal-muted">
            Subject
            <select
              value={subjectFilter ?? ""}
              onChange={(e) => setSubjectFilter(e.target.value || null)}
              className="rounded-lg border border-kal-border bg-kal-background px-2 py-1.5 text-sm text-kal-text"
            >
              <option value="">All</option>
              {subjectOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-semibold text-kal-muted">
            Jump to month
            <input
              type="month"
              className="rounded-lg border border-kal-border bg-kal-background px-2 py-1.5 text-sm text-kal-text"
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                const mw = monthWindow(v);
                if (!mw) return;
                void refresh(mw);
              }}
            />
          </label>
          <button
            type="button"
            className="rounded-lg border border-kal-border px-3 py-2 text-xs font-semibold text-kal-text"
            onClick={() =>
              void refresh(defaultPlannedWindow(initialServerTodayYmd))
            }
          >
            Default date range
          </button>
          <p className="text-[11px] leading-snug text-kal-muted sm:ml-auto sm:text-right">
            Planned window:{" "}
            <span className="font-medium text-kal-text">
              {plannedWindow.fromYmd} → {plannedWindow.toYmd}
            </span>
          </p>
        </div>
        {agendaDates.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-kal-border bg-kal-card-muted/50 px-4 py-6 text-center text-sm text-kal-muted">
            Nothing scheduled yet. Add items in{" "}
            <Link href="/backlog-tracker" className="font-semibold text-kal-accent underline">
              Backlog Tracker
            </Link>
            , then use <strong className="text-kal-text">Unplanned Fix</strong> here to plan.
          </p>
        ) : (
          <div className="space-y-5">
            {agendaDates.map((ymd) => (
              <div key={ymd}>
                <p className="mb-2 text-xs font-bold text-kal-accent">
                  {formatDayLabel(ymd, today)}
                </p>
                <ul className="space-y-2">
                  {(plannedByDateFiltered[ymd] ?? []).map((t) => (
                    <li key={t.task_id}>
                      <button
                        type="button"
                        onClick={() => openPlannedEdit(t)}
                        className="flex w-full items-start justify-between gap-3 rounded-xl border border-kal-border/80 bg-kal-card px-3 py-2.5 text-left transition hover:border-kal-accent/40 hover:bg-kal-card-muted/30"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-kal-text">{t.title}</p>
                          <p className="text-[11px] text-kal-muted">
                            {t.estimated_minutes != null ? `${t.estimated_minutes}m` : "—"}
                            {t.group_label ? ` · ${t.group_label}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-200/90">
                          Recovery
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {sortedPlanDates.filter((d) => d >= today).length > PLANNED_FIX_VISIBLE_DAYS ? (
              <button
                type="button"
                onClick={() => setShowMoreDays((s) => !s)}
                className="text-sm font-semibold text-kal-accent"
              >
                {showMoreDays ? "Show fewer days" : "Show more days"}
              </button>
            ) : null}
          </div>
        )}
      </section>

      {/* Unplanned */}
      <section className="space-y-3 rounded-2xl border border-kal-border/90 bg-kal-card-muted/40 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold text-kal-text">
            Unplanned Fix ({unplannedHeadingCount} items)
          </h2>
          <span className="text-[11px] text-kal-muted">Still pending</span>
        </div>

        {visibleUnplanned.length === 0 ? (
          <p className="text-sm text-kal-muted">
            {subjectFilter
              ? "No pending rows with this subject."
              : "You&apos;re caught up — nothing waiting."}
          </p>
        ) : (
          <ul className="space-y-2">
            {visibleUnplanned.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-1 rounded-lg bg-kal-card px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.title}</p>
                  <p className="text-[11px] text-kal-muted">
                    {row.effort_estimate_minutes != null
                      ? `${row.effort_estimate_minutes}m`
                      : "—"}
                    {row.group_label ? ` · ${row.group_label}` : ""}
                    {missedTodayLabel(row) ? (
                      <span className="text-amber-700 dark:text-amber-200">
                        {" "}
                        · {missedTodayLabel(row)}
                      </span>
                    ) : null}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openTracker([row.id], [row.title], true)}
                  className="shrink-0 self-start rounded-lg border border-kal-accent/30 bg-kal-accent/10 px-2.5 py-1 text-[11px] font-bold text-kal-accent sm:self-center"
                >
                  Plan
                </button>
              </li>
            ))}
          </ul>
        )}

        {hiddenUnplanned > 0 ? (
          <p className="text-[11px] text-kal-muted">
            +{hiddenUnplanned} more — use Fix these.
          </p>
        ) : null}

        <button
          type="button"
          onClick={() =>
            openTracker(
              filteredUnplanned.map((r) => r.id),
              filteredUnplanned.map((r) => r.title),
              true,
            )
          }
          disabled={filteredUnplanned.length === 0}
          className="mt-2 w-full rounded-xl bg-kal-accent py-3 text-sm font-bold text-kal-accent-foreground disabled:opacity-40"
        >
          Fix these
        </button>
      </section>

      <p className="text-center text-xs text-kal-muted">You’re catching up.</p>

      {editRow ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center"
          role="presentation"
        >
          <button
            type="button"
            aria-label="Dismiss"
            className="absolute inset-0 bg-kal-overlay backdrop-blur-sm"
            onClick={closePlannedEdit}
            disabled={editBusy}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="planned-edit-title"
            className="kal-glass-panel relative z-[81] flex w-full max-w-md flex-col rounded-2xl sm:rounded-2xl"
          >
            <div className="space-y-4 px-6 py-6">
              <h2
                id="planned-edit-title"
                className="text-lg font-bold tracking-tight text-kal-text"
              >
                Edit planned item
              </h2>
              <p className="text-sm text-kal-muted">
                Rename, change minutes, or move to another day. This updates your backlog row too.
              </p>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-kal-muted">Title</span>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  disabled={editBusy}
                  className="w-full rounded-xl border border-kal-border bg-kal-background px-3 py-2 text-sm text-kal-text"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-kal-muted">
                  Minutes (optional)
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 25"
                  value={editMinutes}
                  onChange={(e) => setEditMinutes(e.target.value)}
                  disabled={editBusy}
                  className="w-full rounded-xl border border-kal-border bg-kal-background px-3 py-2 text-sm text-kal-text"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-kal-muted">Plan date</span>
                <input
                  type="date"
                  value={editPlanDate}
                  onChange={(e) => setEditPlanDate(e.target.value)}
                  disabled={editBusy}
                  className="w-full rounded-xl border border-kal-border bg-kal-background px-3 py-2 text-sm text-kal-text"
                />
              </label>
              {editError ? (
                <p className="text-sm text-rose-600 dark:text-rose-400">{editError}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-kal-border/50 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={editBusy}
                onClick={closePlannedEdit}
                className="kal-glass-subtle min-h-[48px] rounded-xl px-4 py-3 text-sm font-semibold text-kal-text sm:min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={editBusy}
                onClick={() => void savePlannedEdit()}
                className="min-h-[48px] rounded-xl bg-kal-accent px-5 py-3 text-sm font-semibold text-kal-accent-foreground sm:min-h-[44px]"
              >
                {editBusy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/backlog-tracker" className="font-semibold text-kal-accent hover:underline">
          Backlog Tracker
        </Link>
        <Link href="/syllabus" className="font-semibold text-kal-muted hover:text-kal-accent hover:underline">
          Syllabus Tracker
        </Link>
        <button
          type="button"
          onClick={() => void refresh()}
          className="font-semibold text-kal-muted hover:text-kal-accent"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
