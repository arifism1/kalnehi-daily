"use client";

import { addDays, format, parseISO } from "date-fns";
import { Plus, Video } from "lucide-react";
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
import { PlannerQuickAddCard } from "@/components/planner/PlannerQuickAddCard";
import { TaskCard } from "@/components/task/TaskCard";
import { TransientNotice } from "@/components/ui/TransientNotice";

type TabKey = "today" | "yesterday" | "tomorrow";

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
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [studySheetOpen, setStudySheetOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const taskList = useMemo(() => Object.values(tasksRecord), [tasksRecord]);
  const dayTasks = useMemo(
    () => filterTasksForDate(taskList, assignedDateForTab),
    [taskList, assignedDateForTab],
  );

  const openQuickAdd = useCallback(() => {
    setQuickAddOpen(true);
  }, []);

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
      className="overflow-hidden rounded-2xl border border-white/[0.07] bg-slate-900/25 shadow-xl shadow-black/35 backdrop-blur-md sm:rounded-3xl"
      aria-labelledby="planner-heading"
    >
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-4 py-4 sm:gap-4 sm:px-5 sm:py-6 md:px-7 md:py-7">
        <div className="min-w-0">
          <h2
            id="planner-heading"
            className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-emerald-400/90 sm:text-[0.65rem] sm:tracking-[0.28em]"
          >
            Daily targets
          </h2>
          <p className="mt-1.5 text-sm font-medium leading-snug text-slate-300/95 sm:mt-2 sm:text-[15px] sm:leading-relaxed">
            Jot the plan. One focused block at a time.
          </p>
        </div>
        <button
          type="button"
          disabled={!userId}
          onClick={openQuickAdd}
          className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-emerald-950 shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-50 sm:min-h-0 sm:gap-2 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-xs"
        >
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.5} />
          Add target
        </button>
      </div>

      {syllabusSoon && examLabel ? (
        <div className="border-b border-emerald-500/15 bg-emerald-950/20 px-4 py-3 sm:px-5 md:px-7">
          <p className="text-left text-[11px] leading-relaxed text-emerald-100/90 sm:text-xs">
            <span className="font-semibold text-emerald-300">
              {examTitle || examLabel}
            </span>{" "}
            syllabus picker is coming soon. Targets and timing work as usual;
            optional topic links still use the reference catalog.
          </p>
        </div>
      ) : null}

      <div className="px-4 pt-4 sm:px-5 sm:pt-5 md:px-7">
        <div className="flex gap-1 rounded-xl bg-slate-950/60 p-1 ring-1 ring-white/[0.05] sm:gap-1.5 sm:rounded-2xl sm:p-1.5">
          {(["today", "yesterday", "tomorrow"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`min-h-[42px] flex-1 rounded-lg py-2 text-[11px] font-semibold transition-colors sm:min-h-[46px] sm:rounded-xl sm:py-3 sm:text-xs ${
                tab === k
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-900/25"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {tabDayLabel(k)}
            </button>
          ))}
        </div>

        <p className="mt-2 text-[10px] tabular-nums text-zinc-600 sm:mt-3 sm:text-[11px]">
          {assignedDateForTab}
        </p>

        {userId ? (
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setStudySheetOpen(true)}
              className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-violet-500/35 bg-violet-950/25 px-4 text-sm font-bold text-violet-100 transition-colors hover:bg-violet-950/40 active:scale-[0.99]"
            >
              <Video className="h-5 w-5 shrink-0 text-violet-300" aria-hidden />
              Add study session
            </button>
          </div>
        ) : null}
      </div>

      <div className="mx-4 mt-3 sm:mx-5 sm:mt-4 md:mx-7">
        <TransientNotice
          message={actionNotice}
          onDismiss={() => setActionNotice(null)}
          variant="amber"
        />
      </div>

      <ul className="mt-4 grid grid-cols-1 gap-1.5 px-4 pb-6 sm:mt-5 sm:gap-2 sm:px-5 sm:pb-8 md:px-7 lg:grid-cols-2 lg:gap-3">
        {quickAddOpen && userId && (
          <li className="lg:col-span-2">
            <PlannerQuickAddCard
              userId={userId}
              assignedDate={assignedDateForTab}
              onCancel={() => setQuickAddOpen(false)}
              onSaved={() => setQuickAddOpen(false)}
              onError={(msg) => setActionNotice(msg)}
            />
          </li>
        )}

        {dayTasks.length === 0 && !quickAddOpen && (
          <li className="rounded-xl border border-dashed border-white/[0.08] bg-slate-950/30 px-4 py-10 text-center sm:rounded-2xl sm:px-6 sm:py-14 lg:col-span-2">
            <p className="mx-auto max-w-md text-sm font-medium leading-relaxed text-slate-400 sm:text-[15px]">
              Nothing here yet. Add a target in a few seconds — name it, optional
              time, done.
            </p>
            <button
              type="button"
              disabled={!userId}
              onClick={openQuickAdd}
              className="mt-6 inline-flex min-h-[48px] w-full max-w-[16rem] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-xs font-bold uppercase tracking-wide text-emerald-950 shadow-lg shadow-emerald-500/15 transition-all duration-200 hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-50 sm:mt-8 sm:w-auto sm:min-w-[200px] sm:rounded-2xl sm:text-sm"
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.5} />
              Add target
            </button>
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
