"use client";

import { addDays, format, parseISO } from "date-fns";
import { ArrowLeft, Home, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { AddEditTaskSheet } from "@/components/planner/AddEditTaskSheet";
import { PlannerQuickAddCard } from "@/components/planner/PlannerQuickAddCard";
import { TaskCard } from "@/components/task/TaskCard";
import { TransientNotice } from "@/components/ui/TransientNotice";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { filterTasksForDate } from "@/lib/progressEngine";
import { applyOptimisticTaskDelete, applyOptimisticTaskUpdate } from "@/lib/taskMutations";
import { useAuthStore } from "@/store/useAuthStore";
import { useTaskStore, type Task } from "@/store/useTaskStore";

function isPlaceholderDraftTask(t: Task) {
  return !(t.name ?? "").trim() && !t.start_time && !t.end_time && !t.microtopic_id;
}

export function SelfTypeDayPage() {
  const user = useAuthStore((s) => s.user);
  const today = useCalendarDate();
  const [logDate, setLogDate] = useState(today);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"add" | "edit">("add");
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const taskList = useTaskStore((s) => s.tasks);
  const microtopics = useTaskStore((s) => s.microtopics);

  const dayTasks = useMemo(() => {
    const all = Object.values(taskList);
    return filterTasksForDate(all, logDate).filter((t) => !isPlaceholderDraftTask(t));
  }, [taskList, logDate]);

  const openEdit = useCallback((t: Task) => {
    setEditTask(t);
    setSheetMode("edit");
    setSheetOpen(true);
  }, []);

  const onDelete = useCallback(
    async (t: Task) => {
      if (!user?.id) return;
      await applyOptimisticTaskDelete(t.id, user.id);
      setActionNotice("Task deleted");
    },
    [user?.id],
  );

  const onShiftDay = useCallback(
    async (t: Task, deltaDays: number) => {
      if (!user?.id) return;
      const d = format(addDays(parseISO(t.assigned_date), deltaDays), "yyyy-MM-dd");
      await applyOptimisticTaskUpdate(t.id, { assigned_date: d }, user.id);
      setActionNotice(`Moved to ${d}`);
    },
    [user?.id],
  );

  if (!user) {
    return (
      <p className="rounded-xl border border-kal-warn-border bg-kal-warn-soft px-4 py-3 text-sm text-kal-warn-text">
        Sign in to manage your planner.
      </p>
    );
  }

  return (
    <div className="relative mx-auto max-w-2xl pb-16 pt-2 sm:pt-4">
      <div className="flex items-center gap-3 text-sm font-semibold text-kal-accent">
        <Link href="/plan" className="inline-flex items-center gap-1.5 transition hover:text-kal-accent-hover">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Plan hub
        </Link>
        <span className="text-kal-border">|</span>
        <Link href="/" className="inline-flex items-center gap-1.5 transition hover:text-kal-accent-hover">
          <Home className="h-4 w-4" aria-hidden />
          Home
        </Link>
      </div>

      <header className="mt-6 mb-6">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-kal-accent">
          Planning · Self type
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-kal-text sm:text-3xl">
          Type your day
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-kal-muted">
          Add and edit tasks for any date. This is your dedicated typing planner
          — independent from Dictate and Handwritten.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex min-h-[44px] items-center gap-1 rounded-xl border border-kal-border bg-kal-card-muted p-1">
          {[
            { id: today, label: "Today" },
            { id: format(addDays(parseISO(today), -1), "yyyy-MM-dd"), label: "Yesterday" },
            { id: format(addDays(parseISO(today), 1), "yyyy-MM-dd"), label: "Tomorrow" },
          ].map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setLogDate(d.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                logDate === d.id
                  ? "bg-kal-accent text-white"
                  : "text-kal-muted hover:text-kal-text"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <label className="block text-[11px] font-medium text-kal-muted">
          Date
          <input
            type="date"
            value={logDate}
            onChange={(e) => setLogDate(e.target.value)}
            className="mt-1 block min-h-[44px] rounded-xl border border-kal-border bg-kal-input-bg px-3 text-sm text-kal-text"
          />
        </label>
      </div>

      <TransientNotice message={actionNotice} onDismiss={() => setActionNotice(null)} variant="amber" />

      {quickAddOpen ? (
        <PlannerQuickAddCard
          userId={user.id}
          assignedDate={logDate}
          onCancel={() => setQuickAddOpen(false)}
          onSaved={() => {
            setQuickAddOpen(false);
            setActionNotice("Task added");
          }}
          onError={(msg) => setActionNotice(msg)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setQuickAddOpen(true)}
          className="mb-4 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-kal-border bg-kal-card px-4 py-3 text-sm font-semibold text-kal-text-secondary transition hover:border-kal-accent/40 hover:bg-kal-accent-soft/30"
        >
          <Plus className="h-5 w-5 text-kal-accent" aria-hidden />
          Add a task
        </button>
      )}

      {dayTasks.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-kal-border bg-kal-card-muted py-10 text-center text-sm text-kal-muted">
          No tasks for {logDate === today ? "today" : logDate} yet. Add one above.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {dayTasks.map((t) => (
            <li key={t.id}>
              <TaskCard
                task={t}
                microtopic={microtopics[t.microtopic_id ?? ""] ?? { id: "", subject: "", chapter: "", microtopic: "" }}
                onEdit={() => openEdit(t)}
                onDelete={() => void onDelete(t)}
                onShiftDay={(delta) => void onShiftDay(t, delta)}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm text-kal-muted">
        <Link href="/" className="font-semibold text-kal-accent hover:text-kal-accent-hover">
          Home
        </Link>
        <span>·</span>
        <Link href="/plan" className="font-semibold text-kal-accent hover:text-kal-accent-hover">
          Plan My Day hub
        </Link>
      </div>

      <AddEditTaskSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditTask(null);
        }}
        mode={sheetMode}
        task={editTask}
        defaultAssignedDate={logDate}
      />
    </div>
  );
}
