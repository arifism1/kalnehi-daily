"use client";

import { Check, Loader2, Mic, Pencil, PenLine, Trash2, Type, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  deleteDailyTask,
  listDailyPlanTasksForDate,
  updateDailyTask,
  type DailyTaskView,
} from "@/actions/dailyPlan";
import { findOverlappingTaskPairs } from "@/lib/dailyPlanOverlap";
import { slotFromStartEnd, timeDbToInput } from "@/lib/dailyPlanTime";
import { formatIstSlotRange12h } from "@/lib/voiceIst";

// ─── Source badge ────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: string }) {
  const label =
    source === "voice" ? "Voice" : source === "handwritten" ? "Handwritten" : "Typed";
  const Icon =
    source === "voice" ? Mic : source === "handwritten" ? PenLine : Type;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/30 bg-white/55 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-kal-muted backdrop-blur-sm dark:border-white/12 dark:bg-zinc-900/55">
      <Icon className="h-3 w-3 text-kal-accent" aria-hidden />
      {label}
    </span>
  );
}

// ─── Edit sheet (bottom sheet / centred modal) ────────────────────────────────

type EditSheetProps = {
  task: DailyTaskView;
  onClose: () => void;
  onSaved: (patch: Partial<DailyTaskView>) => void;
};

function DailyTaskEditSheet({ task, onClose, onSaved }: EditSheetProps) {
  const [title, setTitle] = useState(task.title ?? "");
  const [startInput, setStartInput] = useState(
    task.time_start ? timeDbToInput(task.time_start) : "",
  );
  const [endInput, setEndInput] = useState(
    task.time_end ? timeDbToInput(task.time_end) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSave = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Title cannot be empty.");
      return;
    }
    setSaving(true);
    setError(null);
    const { time_slot, time_start, time_end } = slotFromStartEnd(startInput, endInput);
    const res = await updateDailyTask(task.id, {
      title: trimmed,
      time_slot,
      time_start,
      time_end,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSaved({ title: trimmed, time_slot, time_start, time_end });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      {/* backdrop */}
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-[var(--kal-overlay)] backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        className="kal-glass-panel relative z-10 w-full max-w-lg rounded-t-[1.25rem] p-5 sm:rounded-[1.25rem] sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-label="Edit task"
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-muted">
              Edit task
            </p>
            <div className="mt-0.5 flex items-center gap-2">
              <SourceBadge source={task.source} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-kal-muted hover:bg-kal-card-muted hover:text-kal-text"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="edit-task-title" className="text-xs font-medium text-kal-muted">
              Task title
            </label>
            <textarea
              id="edit-task-title"
              ref={textareaRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              rows={3}
              disabled={saving}
              className="mt-1.5 w-full resize-none rounded-xl border border-kal-border bg-kal-input-bg px-3 py-2.5 text-sm leading-relaxed text-kal-text [overflow-wrap:anywhere] transition-colors focus:border-kal-accent/50 focus:outline-none focus:ring-2 focus:ring-kal-accent/25 disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-start" className="text-xs text-kal-muted">
                Start (optional)
              </label>
              <input
                id="edit-start"
                type="time"
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
                disabled={saving}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-kal-border bg-kal-input-bg px-3 py-2 text-sm text-kal-text disabled:opacity-50"
              />
            </div>
            <div>
              <label htmlFor="edit-end" className="text-xs text-kal-muted">
                End (optional)
              </label>
              <input
                id="edit-end"
                type="time"
                value={endInput}
                onChange={(e) => setEndInput(e.target.value)}
                disabled={saving}
                className="mt-1.5 min-h-[44px] w-full rounded-xl border border-kal-border bg-kal-input-bg px-3 py-2 text-sm text-kal-text disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {error ? (
          <p className="mt-3 rounded-xl bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-2xl border border-kal-border py-3 text-sm font-medium text-kal-text-secondary transition-colors hover:bg-kal-card-muted disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-kal-accent py-3 text-sm font-semibold text-white transition-opacity hover:bg-kal-accent-hover disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete confirmation popover ──────────────────────────────────────────────

type DeleteConfirmProps = {
  taskTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
};

function DeleteConfirmBar({ taskTitle, onConfirm, onCancel, busy }: DeleteConfirmProps) {
  return (
    <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-rose-200/70 bg-rose-50/80 px-3 py-2 text-xs backdrop-blur-sm dark:border-rose-500/25 dark:bg-rose-950/30">
      <p className="min-w-0 flex-1 truncate font-medium text-rose-800 dark:text-rose-200">
        Remove &ldquo;{taskTitle}&rdquo;?
      </p>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-md px-2 py-1 font-semibold text-rose-700 transition-colors hover:bg-rose-100 dark:text-rose-300 dark:hover:bg-rose-900/40 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2.5 py-1 font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Main list ────────────────────────────────────────────────────────────────

type Props = {
  planDate: string;
  title?: string;
  className?: string;
};

export function UnifiedDailyPlanList({ planDate, title, className = "" }: Props) {
  const [tasks, setTasks] = useState<DailyTaskView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<DailyTaskView | null>(null);
  /** id of the task waiting for delete confirmation */
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = await listDailyPlanTasksForDate(planDate);
        if (res.ok) setTasks(res.tasks);
        else setError(res.error);
      } catch {
        setError("Could not load plan.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [planDate],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onSync = () => void load({ silent: true });
    window.addEventListener("kalnehi-daily-plan-synced", onSync);
    return () => window.removeEventListener("kalnehi-daily-plan-synced", onSync);
  }, [load]);

  const overlapIds = useMemo(() => findOverlappingTaskPairs(tasks), [tasks]);

  const isDoneStatus = (s: string) => s === "done";

  const toggleDone = async (t: DailyTaskView) => {
    const next = isDoneStatus(t.status) ? "pending" : "done";
    setError(null);
    setBusyId(t.id);
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, status: next } : x)));
    try {
      const res = await updateDailyTask(t.id, { status: next });
      if (!res.ok) {
        setTasks((prev) =>
          prev.map((x) => (x.id === t.id ? { ...x, status: t.status } : x)),
        );
        setError(res.error);
      }
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = (t: DailyTaskView) => {
    setConfirmDeleteId(t.id);
  };

  const cancelDelete = () => setConfirmDeleteId(null);

  const executeDelete = async (t: DailyTaskView) => {
    setDeletingId(t.id);
    setConfirmDeleteId(null);
    setTasks((prev) => prev.filter((x) => x.id !== t.id));
    const res = await deleteDailyTask(t.id);
    if (!res.ok) {
      setTasks((prev) => {
        const already = prev.find((x) => x.id === t.id);
        return already
          ? prev
          : [...prev, t].sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
      });
      setError(res.error);
    }
    setDeletingId(null);
  };

  const handleEditSaved = (id: string, patch: Partial<DailyTaskView>) => {
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const doneCount = tasks.filter((t) => isDoneStatus(t.status)).length;

  return (
    <>
      <section className={`kal-glass-panel rounded-[1.25rem] p-4 sm:p-6 ${className}`}>
        {title ? (
          <h2 className="mb-4 text-lg font-bold text-kal-text">{title}</h2>
        ) : null}

        {loading ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <Loader2 className="h-7 w-7 animate-spin text-kal-accent" />
            <p className="text-sm text-kal-muted">Loading plan…</p>
          </div>
        ) : error ? (
          <p className="text-sm text-[var(--kal-danger-text)]" role="alert">
            {error}
          </p>
        ) : tasks.length === 0 ? (
          <div className="kal-glass-subtle rounded-xl border border-dashed border-white/35 py-14 text-center dark:border-white/15">
            <p className="text-sm font-semibold text-kal-text">Nothing here yet</p>
            <p className="mt-1 text-xs text-kal-muted">
              Add tasks via Dictate My Day, Self Type, or Handwritten below.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-xs font-semibold text-kal-muted">
              {doneCount} / {tasks.length} done
            </p>

            <ul className="space-y-2">
              {tasks.map((t) => {
                const st = t.time_start ? timeDbToInput(t.time_start) : "";
                const et = t.time_end ? timeDbToInput(t.time_end) : "";
                const overlap = overlapIds.has(t.id);
                const done = isDoneStatus(t.status);
                const isDeleting = deletingId === t.id;
                const isConfirming = confirmDeleteId === t.id;

                return (
                  <li
                    key={t.id}
                    // `group` enables sm:group-hover to show action buttons on desktop hover
                    className={`group rounded-xl border p-3 transition-all ${
                      done
                        ? "border-white/20 bg-white/45 opacity-75 backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/45"
                        : "kal-glass-subtle border-white/25 dark:border-white/12"
                    } ${isDeleting ? "pointer-events-none opacity-40" : ""}`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Checkbox */}
                      <button
                        type="button"
                        role="checkbox"
                        disabled={busyId === t.id || isDeleting}
                        onClick={() => void toggleDone(t)}
                        className={`mt-0.5 flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md border-2 transition-colors disabled:opacity-40 ${
                          done
                            ? "border-kal-accent bg-kal-accent text-white"
                            : "border-white/40 bg-white/60 text-transparent hover:border-kal-accent/60 dark:border-white/15 dark:bg-zinc-900/65"
                        }`}
                        aria-checked={done}
                        aria-label={done ? "Mark as not done" : "Mark as done"}
                      >
                        {busyId === t.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-kal-accent" />
                        ) : (
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        )}
                      </button>

                      {/* Task body — clicking opens edit */}
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => { setConfirmDeleteId(null); setEditingTask(t); }}
                        className="min-w-0 flex-1 text-left disabled:pointer-events-none"
                        aria-label={`Edit "${t.title}"`}
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <SourceBadge source={t.source} />
                          {overlap ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                              Overlap
                            </span>
                          ) : null}
                        </div>
                        <p
                          className={`mt-1.5 text-sm font-semibold leading-snug [overflow-wrap:anywhere] ${
                            done
                              ? "text-kal-muted line-through decoration-kal-muted/60"
                              : "text-kal-text"
                          }`}
                        >
                          {t.title}
                        </p>
                        {(st || et) && (
                          <p className="mt-1 text-xs font-medium text-kal-accent-dark dark:text-kal-accent">
                            {formatIstSlotRange12h(st, et)}
                          </p>
                        )}
                        {!st && !et && t.time_slot ? (
                          <p className="mt-1 text-xs text-kal-muted">{t.time_slot}</p>
                        ) : null}
                      </button>

                      {/*
                       * Action buttons
                       * Mobile: always visible at low opacity, 44×44 touch area via p-2.5
                       * Desktop (sm+): hidden until the row is hovered or one button is focused
                       */}
                      <div
                        className={`flex shrink-0 items-center gap-0.5 transition-opacity duration-150 ${
                          isConfirming
                            ? "opacity-100"
                            : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100"
                        }`}
                      >
                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => { setConfirmDeleteId(null); setEditingTask(t); }}
                          disabled={isDeleting}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-kal-muted transition-colors hover:bg-kal-card-muted hover:text-kal-accent disabled:opacity-40 sm:h-7 sm:w-7"
                          aria-label="Edit task"
                        >
                          <Pencil className="h-[14px] w-[14px]" />
                        </button>
                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => (isConfirming ? cancelDelete() : confirmDelete(t))}
                          disabled={isDeleting}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-40 sm:h-7 sm:w-7 ${
                            isConfirming
                              ? "bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                              : "text-kal-muted hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
                          }`}
                          aria-label={isConfirming ? "Cancel delete" : "Delete task"}
                          aria-pressed={isConfirming}
                        >
                          {isDeleting ? (
                            <Loader2 className="h-[14px] w-[14px] animate-spin" />
                          ) : (
                            <Trash2 className="h-[14px] w-[14px]" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Inline delete confirmation bar */}
                    {isConfirming ? (
                      <DeleteConfirmBar
                        taskTitle={t.title}
                        busy={isDeleting}
                        onConfirm={() => void executeDelete(t)}
                        onCancel={cancelDelete}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {/* Edit sheet */}
      {editingTask ? (
        <DailyTaskEditSheet
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSaved={(patch) => {
            handleEditSaved(editingTask.id, patch);
          }}
        />
      ) : null}
    </>
  );
}
