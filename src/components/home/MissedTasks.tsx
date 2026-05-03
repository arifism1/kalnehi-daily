"use client";

import { addDays, format, parseISO } from "date-fns";
import {
  AlertTriangle,
  CalendarCheck,
  Check,
  Loader2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";

import { MissedTasksEmptyIllustration } from "@/components/illustrations/MissedTasksEmptyIllustration";
import { AddEditTaskSheet } from "@/components/planner/AddEditTaskSheet";
import { TaskCard } from "@/components/task/TaskCard";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DateFilterNativeInput } from "@/components/ui/DateFilterNativeInput";
import {
  isCustomDateFilter,
  RelativeDatePresetChips,
} from "@/components/ui/RelativeDatePresetChips";
import { TransientNotice } from "@/components/ui/TransientNotice";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import {
  isOverduePendingRevisionReminder,
  type RevisionDifficulty,
} from "@/lib/engine/revisionSchedule";
import { applyOptimisticTaskUpdate } from "@/lib/taskMutations";
import { deleteTaskWithUndo } from "@/lib/taskUndo";
import {
  hydrateUserPlannerTextRevisionsFromServer,
  normalizePlannerTextBundle,
  plannerTextMarkRevisionReminderDone,
  plannerTextRemoveRevision,
  plannerTextSetRevisionReminderNextDue,
} from "@/lib/userPlannerTextClient";
import { getUserPlannerTextBundleCached } from "@/lib/userPlannerTextLocal";
import type { RevisionQueueEntry } from "@/lib/userPlannerTextTypes";
import { addAcademicTaskToUnifiedDailyPlan } from "@/lib/addAcademicTaskToUnifiedDailyPlan";
import { addRevisionReminderToUnifiedDailyPlan } from "@/lib/addRevisionReminderToUnifiedDailyPlan";
import { resolveMicrotopicForTask } from "@/lib/resolveMicrotopicForTask";
import { useAuthStore } from "@/store/useAuthStore";
import { useTaskStore, type Task } from "@/store/useTaskStore";
import { findMissedIncompleteTasks } from "@/lib/progressEngine";
import { surfaceOptionalString, USER_ERROR } from "@/lib/userFacingErrors";

const PRIORITY_LABEL: Record<RevisionDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

type MissedFilter = "all" | "daily" | "revision";

type MissedRow =
  | { kind: "daily"; sortKey: string; task: Task }
  | { kind: "revision"; sortKey: string; item: RevisionQueueEntry };

function isPlaceholderDraftTask(t: Task): boolean {
  const hasName = (t.name ?? "").trim().length > 0;
  const hasLink = !!(t.microtopic_id && String(t.microtopic_id).trim());
  const hasTime = !!(t.start_time || t.end_time);
  const hasMarks = t.marks_value != null && Number.isFinite(Number(t.marks_value));
  const hasEstimate = t.estimated_time_minutes != null && t.estimated_time_minutes > 0;
  return !hasName && !hasLink && !hasTime && !hasMarks && !hasEstimate;
}

export function MissedTasks() {
  const userId = useAuthStore((s) => s.user?.id);
  const tasksRecord = useTaskStore((s) => s.tasks);
  const syllabusById = useTaskStore((s) => s.microtopics);

  const today = useCalendarDate();
  const taskList = useMemo(() => Object.values(tasksRecord), [tasksRecord]);

  const [revisionItems, setRevisionItems] = useState<RevisionQueueEntry[]>([]);
  const [revisionLoading, setRevisionLoading] = useState(false);
  const [filter, setFilter] = useState<MissedFilter>("all");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [deleteRevision, setDeleteRevision] = useState<RevisionQueueEntry | null>(null);
  const [deleteRevisionBusy, setDeleteRevisionBusy] = useState(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const refreshRevision = useCallback(async () => {
    if (!userId) {
      setRevisionItems([]);
      setRevisionLoading(false);
      return;
    }
    // Seed from IDB cache immediately so the list appears without waiting for the network.
    const cached = await getUserPlannerTextBundleCached(userId);
    if (cached) {
      setRevisionItems(normalizePlannerTextBundle(cached).revisionItems);
    }
    setRevisionLoading(true);
    try {
      // Revision-only sync: single table query, no productivity/todos/prefs overhead.
      const bundle = await hydrateUserPlannerTextRevisionsFromServer(userId);
      setRevisionItems(bundle.revisionItems);
    } finally {
      setRevisionLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refreshRevision();
  }, [refreshRevision]);

  useEffect(() => {
    if (typeof window === "undefined" || !userId) return;
    const onPlanner = () => {
      void getUserPlannerTextBundleCached(userId).then((b) => {
        if (b) setRevisionItems(b.revisionItems);
      });
    };
    window.addEventListener("kalnehi-user-planner-text-changed", onPlanner);
    return () =>
      window.removeEventListener("kalnehi-user-planner-text-changed", onPlanner);
  }, [userId]);

  useEffect(() => {
    setSelectedDate(null);
  }, [filter]);

  const missedDaily = useMemo(
    () =>
      findMissedIncompleteTasks(taskList, today).filter(
        (t) => !isPlaceholderDraftTask(t),
      ),
    [taskList, today],
  );

  const missedRevision = useMemo(
    () => revisionItems.filter((it) => isOverduePendingRevisionReminder(it, today)),
    [revisionItems, today],
  );

  const combinedRows = useMemo((): MissedRow[] => {
    const out: MissedRow[] = [];
    for (const t of missedDaily) {
      out.push({ kind: "daily", sortKey: t.assigned_date, task: t });
    }
    for (const it of missedRevision) {
      out.push({ kind: "revision", sortKey: it.nextDue, item: it });
    }
    out.sort((a, b) => {
      const c = a.sortKey.localeCompare(b.sortKey);
      if (c !== 0) return c;
      return a.kind.localeCompare(b.kind);
    });
    return out;
  }, [missedDaily, missedRevision]);

  const filteredRows = useMemo(() => {
    if (filter === "all") return combinedRows;
    if (filter === "daily")
      return combinedRows.filter((r) => r.kind === "daily");
    return combinedRows.filter((r) => r.kind === "revision");
  }, [combinedRows, filter]);

  const dateRowCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of filteredRows) {
      m.set(r.sortKey, (m.get(r.sortKey) ?? 0) + 1);
    }
    return m;
  }, [filteredRows]);

  const dateFilteredRows = useMemo(() => {
    if (!selectedDate) return filteredRows;
    return filteredRows.filter((r) => r.sortKey === selectedDate);
  }, [filteredRows, selectedDate]);

  const missedRowsGrouped = useMemo(() => {
    if (selectedDate !== null) return null;
    const map = new Map<string, MissedRow[]>();
    for (const r of dateFilteredRows) {
      const list = map.get(r.sortKey) ?? [];
      list.push(r);
      map.set(r.sortKey, list);
    }
    return [...map.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, rows]) => ({ date, rows }));
  }, [dateFilteredRows, selectedDate]);

  const missedPickerBounds = useMemo(() => {
    if (dateRowCounts.size === 0) return null;
    const keys = [...dateRowCounts.keys()].sort((a, b) => a.localeCompare(b));
    return {
      min: keys[0]!,
      max: keys[keys.length - 1]!,
    };
  }, [dateRowCounts]);

  const allCaughtUp = useMemo(
    () => missedDaily.length === 0 && missedRevision.length === 0,
    [missedDaily.length, missedRevision.length],
  );

  const onDelete = useCallback(
    async (t: Task) => {
      await deleteTaskWithUndo(t.id, userId);
    },
    [userId],
  );

  const onShiftDay = useCallback(
    async (t: Task, deltaDays: number) => {
      if (!userId) return;
      const next = format(
        addDays(parseISO(t.assigned_date), deltaDays),
        "yyyy-MM-dd",
      );
      const res = await applyOptimisticTaskUpdate(
        t.id,
        { assigned_date: next },
        userId,
      );
      if (!res.ok) {
        setActionNotice(
          surfaceOptionalString(res.error, USER_ERROR.tryAgain),
        );
        return;
      }
      if (next === today) {
        const planRes = await addAcademicTaskToUnifiedDailyPlan(
          { ...t, assigned_date: next },
          today,
          syllabusById,
        );
        if (!planRes.ok) {
          setActionNotice(
            surfaceOptionalString(
              planRes.error,
              "Date updated. Couldn't add to Today's Plan — try opening Daily Plan.",
            ),
          );
        }
      }
    },
    [userId, today, syllabusById],
  );

  const onMoveToToday = useCallback(
    async (t: Task) => {
      if (!userId) return;
      const res = await applyOptimisticTaskUpdate(
        t.id,
        { assigned_date: today },
        userId,
      );
      if (!res.ok) {
        setActionNotice(
          surfaceOptionalString(res.error, USER_ERROR.tryAgain),
        );
        return;
      }
      const planRes = await addAcademicTaskToUnifiedDailyPlan(
        { ...t, assigned_date: today },
        today,
        syllabusById,
      );
      if (!planRes.ok) {
        setActionNotice(
          surfaceOptionalString(
            planRes.error,
            "Date updated. Couldn't add to Today's Plan — try opening Daily Plan.",
          ),
        );
      }
    },
    [userId, today, syllabusById],
  );

  const onRevisionDone = useCallback(
    async (it: RevisionQueueEntry) => {
      if (!userId) return;
      const b = await plannerTextMarkRevisionReminderDone(userId, it.id, today);
      setRevisionItems(b.revisionItems);
    },
    [userId, today],
  );

  const onRevisionMoveToToday = useCallback(
    async (it: RevisionQueueEntry) => {
      if (!userId) return;
      // Update the revision due-date first so the queue stays consistent even
      // if the daily-plan insert below fails.
      const b = await plannerTextSetRevisionReminderNextDue(userId, it.id, today);
      setRevisionItems(b.revisionItems);
      const planRes = await addRevisionReminderToUnifiedDailyPlan(it, today);
      if (!planRes.ok) {
        setActionNotice(
          surfaceOptionalString(
            planRes.error,
            "Reminder rescheduled. Couldn't add to Today's Plan — try opening Daily Plan.",
          ),
        );
      }
    },
    [userId, today],
  );

  const onRevisionDelete = useCallback(
    async (it: RevisionQueueEntry) => {
      if (!userId) return;
      setDeleteRevisionBusy(true);
      try {
        const b = await plannerTextRemoveRevision(userId, it.id);
        setRevisionItems(b.revisionItems);
      } finally {
        setDeleteRevisionBusy(false);
        setDeleteRevision(null);
      }
    },
    [userId],
  );

  const renderMissedRow = (row: MissedRow, revisionGrouped: boolean) =>
    row.kind === "daily" ? (
      <li key={`d-${row.task.id}`} className="space-y-2">
        <div className="flex justify-end">
          <span className="rounded-full border border-amber-200/90 bg-amber-50/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900/90 dark:border-amber-500/30 dark:bg-amber-950/50 dark:text-amber-100">
            Daily Task
          </span>
        </div>
        <TaskCard
          task={row.task}
          microtopic={resolveMicrotopicForTask(row.task, syllabusById)}
          appearance="missed"
          onEdit={() => {
            setEditTask(row.task);
            setSheetOpen(true);
          }}
          onDelete={() => void onDelete(row.task)}
          onShiftDay={(d) => void onShiftDay(row.task, d)}
        />
        <button
          type="button"
          onClick={() => void onMoveToToday(row.task)}
          className="kal-btn-accent flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl py-3 text-xs font-bold uppercase tracking-wide active:scale-[0.99]"
        >
          <CalendarCheck
            className="h-4 w-4 shrink-0 opacity-95"
            aria-hidden
          />
          Move to today
        </button>
      </li>
    ) : (
      <li
        key={`r-${row.item.id}`}
        className="space-y-2 rounded-2xl border border-kal-border/50 bg-white/80 p-3.5 dark:border-kal-border-strong/50 dark:bg-[rgba(44,36,24,0.88)]"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 font-semibold leading-snug text-kal-text">
            {row.item.title}
          </p>
          <span className="shrink-0 rounded-full border border-violet-200/90 bg-violet-50/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-900/90 dark:border-violet-500/30 dark:bg-violet-950/50 dark:text-violet-200">
            Revision Tracker
          </span>
        </div>
        <p className="text-xs text-kal-muted">
          {revisionGrouped ? (
            PRIORITY_LABEL[row.item.difficulty]
          ) : (
            <>
              Was due{" "}
              <span className="font-medium tabular-nums text-kal-text">
                {row.item.nextDue}
              </span>
              <span className="mx-1.5">·</span>
              {PRIORITY_LABEL[row.item.difficulty]}
            </>
          )}
        </p>
        {row.item.notes.trim() ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-kal-text-secondary">
            {row.item.notes}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={() => void onRevisionDone(row.item)}
            disabled={!userId}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-kal-border/70 bg-kal-card-muted px-3 text-xs font-semibold text-kal-text hover:bg-kal-accent-soft/50 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" aria-hidden />
            Mark done
          </button>
          <button
            type="button"
            onClick={() => void onRevisionMoveToToday(row.item)}
            disabled={!userId}
            className="kal-btn-accent inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wide disabled:opacity-50"
          >
            <CalendarCheck className="h-3.5 w-3.5" aria-hidden />
            Move to today
          </button>
          <button
            type="button"
            onClick={() => setDeleteRevision(row.item)}
            disabled={!userId}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-rose-200/80 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-950/40 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Delete
          </button>
        </div>
      </li>
    );

  if (allCaughtUp) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-6 text-center">
        <MissedTasksEmptyIllustration className="h-36 w-36" />
        <h2 className="mt-3 text-base font-medium text-kal-text">
          You&apos;re all caught up
        </h2>
        <p className="mt-1.5 text-[13px] text-kal-muted max-w-sm">
          No overdue daily plan tasks and no past-due Revision Tracker items.
        </p>
        <Link
          href="/daily-plan"
          className="mt-5 inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-medium transition-colors hover:bg-[#FFF3E4]"
          style={{ border: "0.5px solid #BA7517", color: "#BA7517" }}
        >
          Go to Today&apos;s Plan →
        </Link>
      </div>
    );
  }

  return (
    <section
      className="kal-glass-panel overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/95 via-white to-kal-accent-soft/25 p-4 shadow-md ring-1 ring-amber-900/[0.06] backdrop-blur-md sm:rounded-3xl sm:p-5 dark:border-amber-500/30 dark:from-amber-950/30 dark:via-stone-900/50 dark:to-stone-900/65 dark:ring-white/[0.06]"
      aria-labelledby="missed-heading"
    >
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-300/80 bg-amber-100 text-amber-800 shadow-sm sm:h-11 sm:w-11 sm:rounded-2xl dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2
            id="missed-heading"
            className="text-xs font-bold uppercase tracking-wide text-amber-900 sm:text-sm dark:text-amber-100"
          >
            Overdue &amp; missed
          </h2>
          <p className="mt-0.5 text-[11px] leading-snug text-kal-text-secondary sm:mt-1 sm:text-xs sm:leading-relaxed dark:text-amber-200/85">
            Daily plan tasks and Revision Tracker items you haven&apos;t closed —
            reschedule or finish them.
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-amber-200/60 bg-white/60 px-3 py-2 dark:bg-stone-900/50">
        <p className="text-[11px] leading-snug text-kal-text-secondary dark:text-amber-100/90">
          Exam backlog (recovery loop):{" "}
          <Link href="/task-list" className="font-semibold text-kal-accent underline">
            Backlog List
          </Link>{" "}
          ·{" "}
          <Link href="/backlog-tracker" className="font-semibold text-kal-accent underline">
            Backlog Tracker
          </Link>
        </p>
      </div>

      <div
        className="mt-4 flex flex-wrap gap-1.5"
        role="group"
        aria-label="Filter by type"
      >
        {(
          [
            { id: "all" as const, label: "All" },
            { id: "daily" as const, label: "Daily Task" },
            { id: "revision" as const, label: "Revision Tracker" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setFilter(opt.id)}
            className={clsx(
              "min-h-[36px] rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
              filter === opt.id
                ? "border-kal-accent bg-kal-accent/15 text-kal-text"
                : "border-kal-border/70 bg-white/50 text-kal-text-secondary hover:border-kal-accent/40 hover:text-kal-text dark:bg-zinc-900/50",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {filteredRows.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <RelativeDatePresetChips
            todayYmd={today}
            totalAll={filteredRows.length}
            countByDate={dateRowCounts}
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
            activeVariant="strong"
            className="overflow-y-hidden overscroll-x-contain [touch-action:pan-x]"
          />
          {missedPickerBounds ? (
            <DateFilterNativeInput
              min={missedPickerBounds.min}
              max={missedPickerBounds.max}
              onSelect={setSelectedDate}
              active={isCustomDateFilter(selectedDate, today)}
            />
          ) : null}
        </div>
      ) : null}

      {userId && revisionLoading && missedDaily.length > 0 ? (
        <p className="mt-2 flex items-center gap-2 text-xs text-kal-muted">
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
          Syncing Revision Tracker…
        </p>
      ) : null}

      <TransientNotice
        message={actionNotice}
        onDismiss={() => setActionNotice(null)}
        variant="amber"
      />

      {filteredRows.length === 0 && combinedRows.length > 0 ? (
        <p className="mt-4 rounded-xl border border-kal-border/50 bg-kal-card-muted/50 px-4 py-3 text-sm text-kal-text-secondary">
          Nothing in this filter.{" "}
          <button
            type="button"
            onClick={() => setFilter("all")}
            className="font-semibold text-kal-accent underline underline-offset-2 hover:text-kal-accent-hover"
          >
            Show all
          </button>
        </p>
      ) : null}

      {dateFilteredRows.length === 0 &&
      filteredRows.length > 0 &&
      selectedDate != null ? (
        <p className="mt-4 rounded-xl border border-kal-border/50 bg-kal-card-muted/50 px-4 py-3 text-sm text-kal-text-secondary">
          Nothing on this date.{" "}
          <button
            type="button"
            onClick={() => setSelectedDate(null)}
            className="font-semibold text-kal-accent underline underline-offset-2 hover:text-kal-accent-hover"
          >
            Show all dates
          </button>
        </p>
      ) : null}

      {dateFilteredRows.length > 0 ? (
        selectedDate === null ? (
          <div className="mt-4 space-y-6 sm:mt-5">
            {(missedRowsGrouped ?? []).map(({ date, rows }) => (
              <section key={date} className="space-y-3">
                <h3 className="border-b border-amber-200/60 pb-1.5 text-xs font-bold uppercase tracking-wide text-amber-900/90 dark:border-amber-500/20 dark:text-amber-200/90">
                  {format(parseISO(date), "EEEE, MMM d, yyyy")}
                </h3>
                <ul className="space-y-3 sm:space-y-4">
                  {rows.map((row) => renderMissedRow(row, true))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <ul className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
            {dateFilteredRows.map((row) => renderMissedRow(row, false))}
          </ul>
        )
      ) : null}

      <AddEditTaskSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditTask(null);
        }}
        mode="edit"
        task={editTask}
        defaultAssignedDate={editTask?.assigned_date ?? today}
      />

      <ConfirmDialog
        open={deleteRevision != null}
        title="Remove from tracker?"
        description="This removes the item from Revision Tracker."
        confirmLabel="Delete"
        busy={deleteRevisionBusy}
        onCancel={() => !deleteRevisionBusy && setDeleteRevision(null)}
        onConfirm={() => {
          if (!deleteRevision) return;
          void onRevisionDelete(deleteRevision);
        }}
      />
    </section>
  );
}
