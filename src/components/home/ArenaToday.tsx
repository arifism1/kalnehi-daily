"use client";

import { addDays, format, parseISO } from "date-fns";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { useCalendarDate } from "@/hooks/useCalendarDate";
import { filterTasksForDate } from "@/lib/progressEngine";
import { applyOptimisticTaskUpdate } from "@/lib/taskMutations";
import { deleteTaskWithUndo } from "@/lib/taskUndo";
import { resolveMicrotopicForTask } from "@/lib/resolveMicrotopicForTask";
import { USER_ERROR } from "@/lib/userFacingErrors";
import { useAuthStore } from "@/store/useAuthStore";
import { useTaskStore, type Task } from "@/store/useTaskStore";

import { AddEditTaskSheet } from "@/components/planner/AddEditTaskSheet";
import { PlannerQuickAddCard } from "@/components/planner/PlannerQuickAddCard";
import { TaskCard } from "@/components/task/TaskCard";
import { TransientNotice } from "@/components/ui/TransientNotice";
import { Loader2 } from "lucide-react";

/** Today’s task list — “The Arena” on the home dashboard. */
function isPlaceholderDraftTask(t: Task): boolean {
  const hasName = (t.name ?? "").trim().length > 0;
  const isUnnamedPlannerImport =
    !hasName &&
    (t.source === "handwritten" || t.source === "voice") &&
    !(t.microtopic_id && String(t.microtopic_id).trim());
  if (isUnnamedPlannerImport) return true;
  const hasLink = !!(t.microtopic_id && String(t.microtopic_id).trim());
  const hasTime = !!(t.start_time || t.end_time);
  const hasMarks = t.marks_value != null && Number.isFinite(Number(t.marks_value));
  const hasEstimate =
    (t.estimated_minutes != null && t.estimated_minutes > 0) ||
    (t.estimated_time_minutes != null && t.estimated_time_minutes > 0);
  return !hasName && !hasLink && !hasTime && !hasMarks && !hasEstimate;
}

function ArenaTodayFallback() {
  return (
    <section
      className="overflow-hidden rounded-2xl border border-kal-border bg-kal-card kal-shadow-card sm:rounded-2xl"
      aria-busy="true"
      aria-label="Loading today’s targets"
    >
      <div className="flex min-h-[120px] items-center justify-center border-b border-kal-border px-6 py-10 sm:px-8">
        <Loader2 className="h-8 w-8 animate-spin text-kal-accent" aria-hidden />
      </div>
    </section>
  );
}

function ArenaTodayInner() {
  const userId = useAuthStore((s) => s.user?.id);
  const tasksRecord = useTaskStore((s) => s.tasks);
  const syllabusById = useTaskStore((s) => s.microtopics);
  const searchParams = useSearchParams();
  const router = useRouter();

  const today = useCalendarDate();
  const taskList = useMemo(() => Object.values(tasksRecord), [tasksRecord]);
  const dayTasks = useMemo(
    () => filterTasksForDate(taskList, today).filter((t) => !isPlaceholderDraftTask(t)),
    [taskList, today],
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"add" | "edit">("add");
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("quickAdd") !== "1") return;
    setQuickAddOpen(true);
    router.replace("/", { scroll: false });
  }, [searchParams, router]);

  const openEdit = useCallback((t: Task) => {
    setSheetMode("edit");
    setEditTask(t);
    setSheetOpen(true);
  }, []);

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

  return (
    <section
      id="arena"
      className="scroll-mt-6 overflow-hidden rounded-2xl border border-kal-border bg-kal-card kal-shadow-card sm:rounded-2xl"
      aria-labelledby="arena-heading"
    >
      <div className="flex flex-col gap-4 border-b border-kal-border px-6 py-6 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-8 sm:py-7">
        <div className="min-w-0">
          <h2
            id="arena-heading"
            className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-kal-accent sm:text-[0.65rem] sm:tracking-[0.3em]"
          >
            The arena
          </h2>
          <p className="mt-1.5 text-sm font-medium leading-snug text-kal-text-secondary sm:mt-2 sm:text-[15px] sm:leading-relaxed">
            Today&apos;s targets — open Day Plan to add, then execute here.
          </p>
        </div>
        <Link
          href="/plan-my-day"
          className="inline-flex min-h-[48px] w-full shrink-0 items-center justify-center rounded-xl bg-kal-accent px-6 py-3 text-xs font-bold uppercase tracking-wide text-kal-accent-foreground shadow-sm transition-all duration-200 hover:bg-kal-accent-hover active:scale-[0.98] sm:w-auto sm:min-h-[44px] sm:px-5"
        >
          Open Day Plan
        </Link>
      </div>

      <div className="mx-6 mt-4 sm:mx-8 sm:mt-5">
        <TransientNotice
          message={actionNotice}
          onDismiss={() => setActionNotice(null)}
          variant="amber"
        />
      </div>

      <ul className="grid grid-cols-1 gap-2 px-6 pb-8 pt-2 sm:gap-4 sm:px-8 sm:pb-10 sm:pt-3 lg:grid-cols-2 lg:gap-5 xl:gap-6">
        {quickAddOpen && userId && (
          <li className="lg:col-span-2">
            <PlannerQuickAddCard
              userId={userId}
              assignedDate={today}
              onCancel={() => setQuickAddOpen(false)}
              onSaved={() => setQuickAddOpen(false)}
              onError={(msg) => setActionNotice(msg)}
            />
          </li>
        )}

        {dayTasks.length === 0 && !quickAddOpen && (
          <li className="px-1 py-10 text-center sm:px-2 sm:py-14 lg:col-span-2">
            <p className="mx-auto max-w-sm text-sm font-medium leading-relaxed text-kal-muted sm:text-[15px]">
              No targets for today yet. Use{" "}
              <span className="font-semibold text-kal-text-secondary">
                Open Day Plan
              </span>{" "}
              to scan, type, or dictate — then your list shows up here.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:mt-8 sm:flex-row sm:justify-center sm:gap-4">
              <Link
                href="/plan-my-day"
                className="inline-flex min-h-[48px] w-full max-w-[15rem] items-center justify-center rounded-xl bg-kal-accent px-6 py-3 text-xs font-bold text-kal-accent-foreground shadow-sm transition-all duration-200 hover:bg-kal-accent-hover active:scale-[0.98] sm:w-auto sm:min-h-[52px] sm:min-w-[200px] sm:rounded-xl sm:px-8 sm:py-3.5 sm:text-sm"
              >
                Open Day Plan
              </Link>
              <Link
                href="/plan"
                className="text-xs font-semibold text-kal-accent underline-offset-4 transition-colors duration-200 hover:text-kal-accent-hover hover:underline sm:text-sm"
              >
                Open execution planner
              </Link>
            </div>
          </li>
        )}

        {dayTasks.map((t) => (
          <li key={t.id} className="sm:px-0">
            <TaskCard
              task={t}
              microtopic={resolveMicrotopicForTask(t, syllabusById)}
              onEdit={() => openEdit(t)}
              onDelete={() => void onDelete(t)}
              onShiftDay={(d) => void onShiftDay(t, d)}
            />
          </li>
        ))}
      </ul>

      <AddEditTaskSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        mode={sheetMode}
        task={editTask}
        defaultAssignedDate={today}
      />
    </section>
  );
}

export function ArenaToday() {
  return (
    <Suspense fallback={<ArenaTodayFallback />}>
      <ArenaTodayInner />
    </Suspense>
  );
}
