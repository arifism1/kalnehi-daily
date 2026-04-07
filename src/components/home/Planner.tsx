"use client";

import { addDays, format, parseISO } from "date-fns";
import Link from "next/link";
import { Video } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useSyllabusTracker } from "@/hooks/useSyllabusTracker";
import { useTargetExamDisplay } from "@/hooks/useTargetExamDisplay";
import { shouldShowSyllabusComingSoon } from "@/lib/examProfile";
import { applyOptimisticTaskUpdate } from "@/lib/taskMutations";
import { deleteTaskWithUndo } from "@/lib/taskUndo";
import { filterTasksForDate } from "@/lib/progressEngine";
import { resolveMicrotopicForTask } from "@/lib/resolveMicrotopicForTask";
import { USER_ERROR } from "@/lib/userFacingErrors";
import { useAuthStore } from "@/store/useAuthStore";
import { useTaskStore, type Task } from "@/store/useTaskStore";

import { AddEditTaskSheet } from "@/components/planner/AddEditTaskSheet";
import { AddStudySessionSheet } from "@/components/study/AddStudySessionSheet";
import { TaskCard } from "@/components/task/TaskCard";
import { TransientNotice } from "@/components/ui/TransientNotice";

type TabKey = "today" | "yesterday" | "tomorrow";

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

function tabDayLabel(tab: TabKey): string {
  if (tab === "today") return "Today";
  if (tab === "yesterday") return "Yesterday";
  return "Tomorrow";
}

export function Planner() {
  const userId = useAuthStore((s) => s.user?.id);
  const {
    examLabel,
    examDisplayName,
    examLabelLoading: examLoading,
  } = useTargetExamDisplay();
  const examTitle = examDisplayName || examLabel || "";
  const {
    rows: syllabusRows,
    cuetAwaitingDomainSelection,
    loading: syllabusLoading,
    error: syllabusError,
  } = useSyllabusTracker();
  const syllabusSoon = shouldShowSyllabusComingSoon({
    examLabel,
    examLabelLoading: examLoading,
    syllabusLoading,
    syllabusError,
    syllabusRowCount: syllabusRows.length,
    cuetAwaitingDomainSelection,
  });

  const tasksRecord = useTaskStore((s) => s.tasks);
  const syllabusById = useTaskStore((s) => s.microtopics);

  const today = useCalendarDate();
  const yesterday = useMemo(
    () => format(addDays(parseISO(today), -1), "yyyy-MM-dd"),
    [today],
  );
  const tomorrow = useMemo(
    () => format(addDays(parseISO(today), 1), "yyyy-MM-dd"),
    [today],
  );

  const [tab, setTab] = useState<TabKey>("today");
  const assignedDateForTab =
    tab === "today" ? today : tab === "yesterday" ? yesterday : tomorrow;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"add" | "edit">("add");
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [studySheetOpen, setStudySheetOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const taskList = useMemo(() => Object.values(tasksRecord), [tasksRecord]);
  const dayTasks = useMemo(
    () =>
      filterTasksForDate(taskList, assignedDateForTab).filter(
        (t) => !isPlaceholderDraftTask(t),
      ),
    [taskList, assignedDateForTab],
  );

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
      id="task-planner"
      className="overflow-hidden rounded-[1rem] border border-kal-border bg-kal-card kal-shadow-card sm:rounded-[1.25rem]"
      aria-labelledby="planner-heading"
    >
      <div className="flex items-start justify-between gap-3 border-b border-kal-border px-4 py-4 sm:gap-4 sm:px-6 sm:py-6 md:px-8 md:py-7">
        <div className="min-w-0">
          <h2
            id="planner-heading"
            className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-kal-accent sm:text-[0.65rem] sm:tracking-[0.28em]"
          >
            Daily targets
          </h2>
          <p className="mt-1.5 text-sm font-medium leading-snug text-kal-text-secondary sm:mt-2 sm:text-[15px] sm:leading-relaxed">
            Jot the plan. One focused block at a time.
          </p>
        </div>
        <Link
          href="/plan-my-day"
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl bg-kal-accent px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-kal-accent-foreground shadow-sm transition-all duration-200 hover:bg-kal-accent-hover active:scale-[0.98] sm:min-h-0 sm:rounded-xl sm:px-4 sm:py-3 sm:text-xs"
        >
          Open Day Plan
        </Link>
      </div>

      {syllabusSoon && examLabel ? (
        <div className="border-b border-kal-accent/20 bg-kal-accent-soft px-4 py-3 sm:px-6 md:px-8">
          <p className="text-left text-[11px] leading-relaxed text-kal-text-secondary sm:text-xs">
            <span className="font-semibold text-kal-accent-dark dark:text-kal-accent">
              {examTitle || examLabel}
            </span>{" "}
            syllabus picker is coming soon. Targets and timing work as usual;
            optional topic links still use the reference catalog.
          </p>
        </div>
      ) : null}

      <div className="px-4 pt-4 sm:px-6 sm:pt-5 md:px-8">
        <div className="flex gap-1 rounded-xl border border-kal-border bg-kal-card-muted p-1 sm:gap-1.5 sm:rounded-xl sm:p-1.5">
          {(["today", "yesterday", "tomorrow"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`min-h-[42px] flex-1 rounded-lg py-2 text-[11px] font-semibold transition-colors sm:min-h-[46px] sm:rounded-lg sm:py-3 sm:text-xs ${
                tab === k
                  ? "bg-kal-accent text-white shadow-sm"
                  : "text-kal-muted hover:text-kal-text"
              }`}
            >
              {tabDayLabel(k)}
            </button>
          ))}
        </div>

        <p className="mt-2 text-[10px] tabular-nums text-kal-muted sm:mt-3 sm:text-[11px]">
          {assignedDateForTab}
        </p>

        {userId ? (
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setStudySheetOpen(true)}
              className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl border border-kal-border bg-kal-card-muted px-4 text-sm font-bold text-kal-text transition-colors hover:bg-kal-border/30 active:scale-[0.99]"
            >
              <Video className="h-5 w-5 shrink-0 text-kal-accent" aria-hidden />
              Add study session
            </button>
          </div>
        ) : null}
      </div>

      <div className="mx-4 mt-3 sm:mx-6 sm:mt-4 md:mx-8">
        <TransientNotice
          message={actionNotice}
          onDismiss={() => setActionNotice(null)}
          variant="amber"
        />
      </div>

      <ul className="mt-4 grid grid-cols-1 gap-2 px-4 pb-6 sm:mt-5 sm:gap-3 sm:px-6 sm:pb-8 md:px-8 lg:grid-cols-2 lg:gap-4">
        {dayTasks.length === 0 && (
          <li className="rounded-xl border border-dashed border-kal-border bg-kal-card-muted px-4 py-10 text-center sm:rounded-[1rem] sm:px-6 sm:py-14 lg:col-span-2">
            <p className="mx-auto max-w-md text-sm font-medium leading-relaxed text-kal-muted sm:text-[15px]">
              Nothing here yet. Use{" "}
              <span className="font-semibold text-kal-text-secondary">
                Open Day Plan
              </span>{" "}
              to scan, type, or dictate — then pick this day in the tabs above.
            </p>
            <Link
              href="/plan-my-day"
              className="mt-6 inline-flex min-h-[48px] w-full max-w-[16rem] items-center justify-center rounded-xl bg-kal-accent px-5 py-3 text-xs font-bold uppercase tracking-wide text-kal-accent-foreground shadow-sm transition-all duration-200 hover:bg-kal-accent-hover active:scale-[0.98] sm:mt-8 sm:w-auto sm:min-w-[200px] sm:text-sm"
            >
              Open Day Plan
            </Link>
          </li>
        )}

        {dayTasks.map((t) => (
          <li key={t.id}>
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
        defaultAssignedDate={assignedDateForTab}
      />

      <AddStudySessionSheet
        open={studySheetOpen}
        onClose={() => setStudySheetOpen(false)}
      />
    </section>
  );
}
