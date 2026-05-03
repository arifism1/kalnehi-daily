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
} from "@/actions/backlogRecovery";
import {
  BACKLOG_TRACKER_PREFILL_KEY,
  type BacklogTrackerPrefillV1,
} from "@/lib/backlogRecoveryConstants";
import { useCalendarDate } from "@/hooks/useCalendarDate";

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
};

export function TaskListClient({
  initialUnplanned,
  initialUnplannedTotal,
  initialPlannedByDate,
  initialServerTodayYmd,
}: Props) {
  const router = useRouter();
  const today = useCalendarDate();
  const [unplanned, setUnplanned] = useState(initialUnplanned);
  const [unplannedTotal, setUnplannedTotal] = useState(initialUnplannedTotal);
  const [plannedByDate, setPlannedByDate] = useState(initialPlannedByDate);
  const [showMoreDays, setShowMoreDays] = useState(false);

  useEffect(() => {
    void rolloverMissedBacklogRecoveryTasks(today);
  }, [today]);

  const refresh = useCallback(async () => {
    const res = await fetchTaskListPayload();
    if (!res.ok) return;
    setUnplanned(res.unplanned);
    setUnplannedTotal(res.unplannedTotal);
    setPlannedByDate(res.plannedByDate);
  }, []);

  const sortedPlanDates = useMemo(() => {
    return Object.keys(plannedByDate)
      .filter((d) => (plannedByDate[d]?.length ?? 0) > 0)
      .sort();
  }, [plannedByDate]);

  const agendaDates = useMemo(() => {
    const future = sortedPlanDates.filter((d) => d >= today);
    return showMoreDays ? future : future.slice(0, 3);
  }, [sortedPlanDates, today, showMoreDays]);

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

  const visibleUnplanned = unplanned.slice(0, 5);
  const hiddenUnplanned = Math.max(0, unplannedTotal - visibleUnplanned.length);

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
                  {(plannedByDate[ymd] ?? []).map((t) => (
                    <li
                      key={t.task_id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-kal-border/80 bg-kal-card px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-kal-text">{t.title}</p>
                        <p className="text-[11px] text-kal-muted">
                          {t.estimated_minutes != null ? `${t.estimated_minutes}m` : "—"}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-200/90">
                        Recovery
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {sortedPlanDates.filter((d) => d >= today).length > 3 ? (
              <button
                type="button"
                onClick={() => setShowMoreDays((s) => !s)}
                className="text-sm font-semibold text-kal-accent"
              >
                {showMoreDays ? "Show fewer days" : "More days"}
              </button>
            ) : null}
          </div>
        )}
      </section>

      {/* Unplanned */}
      <section className="space-y-3 rounded-2xl border border-kal-border/90 bg-kal-card-muted/40 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold text-kal-text">
            Unplanned Fix ({unplannedTotal} items)
          </h2>
          <span className="text-[11px] text-kal-muted">Still pending</span>
        </div>

        {visibleUnplanned.length === 0 ? (
          <p className="text-sm text-kal-muted">You’re caught up — nothing waiting.</p>
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
              unplanned.map((r) => r.id),
              unplanned.map((r) => r.title),
              true,
            )
          }
          disabled={unplanned.length === 0}
          className="mt-2 w-full rounded-xl bg-kal-accent py-3 text-sm font-bold text-kal-accent-foreground disabled:opacity-40"
        >
          Fix these
        </button>
      </section>

      <p className="text-center text-xs text-kal-muted">You’re catching up.</p>

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
