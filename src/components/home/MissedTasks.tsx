"use client";

import { addDays, format, parseISO } from "date-fns";
import { AlertTriangle, CalendarCheck } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { applyOptimisticTaskUpdate } from "@/lib/taskMutations";
import { deleteTaskWithUndo } from "@/lib/taskUndo";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { findMissedIncompleteTasks } from "@/lib/progressEngine";
import { resolveMicrotopicForTask } from "@/lib/resolveMicrotopicForTask";
import { useAuthStore } from "@/store/useAuthStore";
import { useTaskStore, type Task } from "@/store/useTaskStore";
import { USER_ERROR } from "@/lib/userFacingErrors";

import { AddEditTaskSheet } from "@/components/planner/AddEditTaskSheet";
import { TaskCard } from "@/components/task/TaskCard";
import { TransientNotice } from "@/components/ui/TransientNotice";

function isPlaceholderDraftTask(t: Task): boolean {
  const hasName = (t.name ?? "").trim().length > 0;
  const hasLink = !!(t.microtopic_id && String(t.microtopic_id).trim());
  const hasTime = !!(t.start_time || t.end_time);
  const hasMarks = t.marks_value != null && Number.isFinite(Number(t.marks_value));
  const hasEstimate =
    (t.estimated_minutes != null && t.estimated_minutes > 0) ||
    (t.estimated_time_minutes != null && t.estimated_time_minutes > 0);
  return !hasName && !hasLink && !hasTime && !hasMarks && !hasEstimate;
}

export function MissedTasks() {
  const userId = useAuthStore((s) => s.user?.id);
  const tasksRecord = useTaskStore((s) => s.tasks);
  const syllabusById = useTaskStore((s) => s.microtopics);

  const today = useCalendarDate();
  const taskList = useMemo(() => Object.values(tasksRecord), [tasksRecord]);

  const missed = useMemo(
    () => findMissedIncompleteTasks(taskList, today).filter((t) => !isPlaceholderDraftTask(t)),
    [taskList, today],
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

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
      if (!res.ok) setActionNotice(res.error || USER_ERROR.tryAgain);
    },
    [userId],
  );

  const onMoveToToday = useCallback(
    async (t: Task) => {
      if (!userId) return;
      const res = await applyOptimisticTaskUpdate(
        t.id,
        { assigned_date: today },
        userId,
      );
      if (!res.ok) setActionNotice(res.error || USER_ERROR.tryAgain);
    },
    [userId, today],
  );

  if (missed.length === 0) return null;

  return (
    <section
      className="kal-glass-panel overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/95 via-white to-kal-accent-soft/25 p-4 shadow-md ring-1 ring-amber-900/[0.06] backdrop-blur-md sm:rounded-3xl sm:p-5 dark:border-amber-500/25 dark:from-amber-950/40 dark:via-zinc-950/55 dark:to-zinc-950/70 dark:ring-white/5"
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
            Carry-over targets
          </h2>
          <p className="mt-0.5 text-[11px] leading-snug text-kal-text-secondary sm:mt-1 sm:text-xs sm:leading-relaxed dark:text-amber-200/85">
            From days you didn&apos;t close — move them forward or finish them
            today.
          </p>
        </div>
      </div>
      <TransientNotice
        message={actionNotice}
        onDismiss={() => setActionNotice(null)}
        variant="amber"
      />
      <ul className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
        {missed.map((t) => (
          <li key={t.id} className="space-y-3">
            <TaskCard
              task={t}
              microtopic={resolveMicrotopicForTask(t, syllabusById)}
              appearance="missed"
              onEdit={() => {
                setEditTask(t);
                setSheetOpen(true);
              }}
              onDelete={() => void onDelete(t)}
              onShiftDay={(d) => void onShiftDay(t, d)}
            />
            <button
              type="button"
              onClick={() => void onMoveToToday(t)}
              className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl border-2 border-red-700/15 bg-kal-accent py-3 text-xs font-bold uppercase tracking-wide text-white shadow-md shadow-red-900/10 ring-1 ring-red-900/10 transition-all duration-200 hover:bg-kal-accent-hover active:scale-[0.99] dark:border-red-400/25 dark:shadow-red-950/40"
            >
              <CalendarCheck className="h-4 w-4 shrink-0 opacity-95" aria-hidden />
              Move to today
            </button>
          </li>
        ))}
      </ul>

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
    </section>
  );
}
