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

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

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
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);

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

  const confirmDelete = async () => {
    if (!pendingDelete || !userId) return;
    const id = pendingDelete.id;
    setBusyId(id);
    try {
      await deleteTaskWithUndo(id, userId);
    } finally {
      setBusyId(null);
      setPendingDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <EngineHero
        eyebrow="Accountability"
        title="Pending Tasks"
        description="Every open target in one place — missed backlog first. Reallocate to today or delete noise so your rank reflects discipline."
      />

      <EngineCard title="Missed · past due">
        {missed.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No missed tasks — your backlog is clear.
          </p>
        ) : (
          <ul className="space-y-3">
            {missed.map((t) => (
              <li
                key={t.id}
                className="flex flex-col gap-2 rounded-xl border border-rose-500/25 bg-rose-950/15 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-white">
                    {taskTitle(t, microRecord)}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {t.assigned_date} · weight{" "}
                    {resolveTaskMarksWeight(t, microRecord).toFixed(1)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === t.id}
                    onClick={() => void moveToToday(t)}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    Move to today
                  </button>
                  <button
                    type="button"
                    disabled={busyId === t.id}
                    onClick={() => setPendingDelete(t)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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
          <p className="text-sm text-zinc-500">
            No future-dated incomplete tasks.
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2.5 text-sm"
              >
                <span className="text-zinc-200">{taskTitle(t, microRecord)}</span>
                <span className="text-xs text-zinc-500">{t.assigned_date}</span>
              </li>
            ))}
          </ul>
        )}
      </EngineCard>

      <ConfirmDialog
        open={pendingDelete != null}
        title="Delete task?"
        description="Remove this task from your plan permanently?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        busy={busyId === pendingDelete?.id}
        onCancel={() => !busyId && setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
