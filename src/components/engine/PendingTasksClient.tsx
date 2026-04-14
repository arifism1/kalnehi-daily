"use client";

import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useRefreshTasksOnHomeFocus } from "@/hooks/useRefreshTasksOnHomeFocus";
import {
  findMissedIncompleteTasks,
  resolveTaskMarksWeight,
} from "@/lib/progressEngine";
import { applyOptimisticTaskUpdate } from "@/lib/taskMutations";
import { deleteTaskWithUndo } from "@/lib/taskUndo";
import { useAuthStore } from "@/store/useAuthStore";
import { useTaskStore } from "@/store/useTaskStore";
import type { Microtopic, Task } from "@/store/useTaskStore";

import { EngineCard, EngineHero } from "./EngineHero";

function taskTitle(t: Task, microtopicById: Record<string, Microtopic>) {
  const m = t.microtopic_id ? microtopicById[t.microtopic_id] : null;
  return t.name?.trim() || m?.microtopic || "Task";
}

export function PendingTasksClient() {
  useRefreshTasksOnHomeFocus();
  const today = useCalendarDate();
  const userId = useAuthStore((s) => s.user?.id);
  const tasksRecord = useTaskStore((s) => s.tasks);
  const microRecord = useTaskStore((s) => s.microtopics);

  const [busyId, setBusyId] = useState<string | null>(null);

  const { missed, upcoming } = useMemo(() => {
    const tasks = Object.values(tasksRecord);
    const incomplete = tasks.filter((t) => t.status !== "completed");
    const missedList = findMissedIncompleteTasks(tasks, today).sort((a, b) =>
      a.assigned_date.localeCompare(b.assigned_date),
    );
    const missedIds = new Set(missedList.map((t) => t.id));
    const upcomingList = incomplete
      .filter((t) => !missedIds.has(t.id))
      .sort((a, b) => a.assigned_date.localeCompare(b.assigned_date));
    return { missed: missedList, upcoming: upcomingList };
  }, [tasksRecord, today]);

  const moveToToday = async (t: Task) => {
    if (!userId) return;
    setBusyId(t.id);
    try {
      await applyOptimisticTaskUpdate(
        t.id,
        { assigned_date: today },
        userId,
      );
    } finally {
      setBusyId(null);
    }
  };

  const deleteTask = async (t: Task) => {
    if (!userId) return;
    setBusyId(t.id);
    try {
      await deleteTaskWithUndo(t.id, userId);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <EngineHero
        eyebrow="Accountability"
        title="Pending Tasks"
        description="Every open target in one place — missed backlog first. Reallocate to today or delete noise so your rank reflects discipline."
      />

      <EngineCard
        title="Missed · past due"
        className="border-rose-200/80 bg-gradient-to-b from-rose-50/90 via-white/80 to-white/90 ring-1 ring-rose-900/[0.06] dark:border-rose-500/25 dark:from-rose-950/35 dark:via-zinc-950/50 dark:to-zinc-950/70 dark:ring-white/5"
      >
        {missed.length === 0 ? (
          <p className="text-sm text-kal-muted">
            No missed tasks — your backlog is clear.
          </p>
        ) : (
          <ul className="space-y-3">
            {missed.map((t) => (
              <li
                key={t.id}
                className="flex flex-col gap-3 rounded-xl border border-rose-200/90 bg-white/95 px-3.5 py-3.5 shadow-sm ring-1 ring-rose-900/[0.04] sm:flex-row sm:items-center sm:justify-between dark:border-rose-500/35 dark:bg-rose-950/50 dark:ring-rose-500/15"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-kal-text dark:text-rose-50">
                    {taskTitle(t, microRecord)}
                  </p>
                  <p className="mt-0.5 text-xs text-kal-text-secondary dark:text-rose-200/80">
                    {t.assigned_date} · weight{" "}
                    {resolveTaskMarksWeight(t, microRecord).toFixed(1)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <button
                    type="button"
                    disabled={busyId === t.id}
                    onClick={() => void moveToToday(t)}
                    className="rounded-lg border border-red-700/20 bg-kal-accent px-3 py-2 text-xs font-semibold text-white shadow-sm ring-1 ring-red-900/15 transition-colors hover:bg-kal-accent-hover disabled:opacity-50 dark:border-red-400/30 dark:ring-red-950/40"
                  >
                    Move to today
                  </button>
                  <button
                    type="button"
                    disabled={busyId === t.id}
                    onClick={() => void deleteTask(t)}
                    className="inline-flex items-center gap-1.5 rounded-lg border-2 border-kal-border bg-kal-card-muted/90 px-3 py-2 text-xs font-semibold text-kal-text shadow-sm transition-colors hover:border-rose-300 hover:bg-rose-50/80 hover:text-rose-900 disabled:opacity-50 dark:border-slate-500 dark:bg-slate-900/60 dark:text-zinc-200 dark:hover:border-rose-400/50 dark:hover:bg-rose-950/40 dark:hover:text-rose-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </EngineCard>

      <EngineCard title="Upcoming · not yet due">
        {upcoming.length === 0 ? (
          <p className="text-sm text-kal-muted">
            No future-dated incomplete tasks.
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-kal-border bg-kal-card-muted/80 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950/40"
              >
                <span className="font-medium text-kal-text dark:text-zinc-200">
                  {taskTitle(t, microRecord)}
                </span>
                <span className="text-xs tabular-nums text-kal-muted dark:text-zinc-500">
                  {t.assigned_date}
                </span>
              </li>
            ))}
          </ul>
        )}
      </EngineCard>
    </div>
  );
}
