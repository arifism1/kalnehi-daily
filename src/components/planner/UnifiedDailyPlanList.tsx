"use client";

import { Check, Loader2, Mic, Pencil, PenLine, Trash2, Type, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  deleteDailyTask,
  insertDailyTask,
  listDailyPlanTasksForDate,
  updateDailyTask,
  type DailyTaskView,
} from "@/actions/dailyPlan";
import { useUndoStore } from "@/store/useUndoStore";
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

// ─── Loading skeleton (matches task row shape; no blank white spinner card) ─

const DAILY_PLAN_LOADING_MESSAGE = "Figuring out your genius plan…";

function DailyPlanListSkeleton({ rowCount = 5 }: { rowCount?: number }) {
  return (
    <div className="space-y-2.5" aria-hidden>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="h-3.5 w-20 animate-pulse rounded-md bg-kal-text/[0.08] dark:bg-white/[0.08]" />
        <div className="h-3 w-14 animate-pulse rounded-md bg-kal-text/[0.06] dark:bg-white/[0.06]" />
      </div>
      {Array.from({ length: rowCount }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse items-start gap-2 rounded-2xl border border-white/15 bg-white/[0.04] px-3 py-3 dark:border-white/10 dark:bg-zinc-900/35"
        >
          <div className="h-11 w-11 shrink-0 rounded-xl bg-kal-text/[0.08] dark:bg-white/[0.08]" />
          <div className="min-w-0 flex-1 space-y-2.5 pt-0.5">
            <div className="flex gap-2">
              <div className="h-5 w-16 rounded-full bg-kal-text/[0.07] dark:bg-white/[0.07]" />
              <div className="h-5 w-14 rounded-full bg-kal-text/[0.05] dark:bg-white/[0.05]" />
            </div>
            <div className="h-4 w-[88%] max-w-md rounded-md bg-kal-text/[0.09] dark:bg-white/[0.09]" />
            <div className="h-3 w-28 rounded-md bg-kal-text/[0.06] dark:bg-white/[0.06]" />
          </div>
          <div className="flex shrink-0 gap-1 pt-0.5">
            <div className="h-7 w-7 rounded-lg bg-kal-text/[0.06] dark:bg-white/[0.06]" />
            <div className="h-7 w-7 rounded-lg bg-kal-text/[0.06] dark:bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function dispatchDailyPlanSynced() {
  window.dispatchEvent(new Event("kalnehi-daily-plan-synced"));
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;
      if (!silent) {
        setLoading(true);
        setTasks([]);
      }
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
  const isSkippedStatus = (s: string) => s === "skipped";
  const isCompletedStatus = (s: string) => isDoneStatus(s) || isSkippedStatus(s);

  const toggleDone = async (t: DailyTaskView) => {
    if (isSkippedStatus(t.status)) return;
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
      } else {
        dispatchDailyPlanSynced();
      }
    } finally {
      setBusyId(null);
    }
  };

  const deleteTaskNow = async (t: DailyTaskView) => {
    setDeletingId(t.id);
    setTasks((prev) => prev.filter((x) => x.id !== t.id));
    const snapshot = t;
    const res = await deleteDailyTask(t.id);
    setDeletingId(null);
    if (!res.ok) {
      setTasks((prev) => {
        const already = prev.find((x) => x.id === t.id);
        return already
          ? prev
          : [...prev, t].sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
      });
      setError(res.error);
      return;
    }

    dispatchDailyPlanSynced();

    const src = snapshot.source;
    if (src !== "typed" && src !== "voice" && src !== "handwritten") {
      return;
    }

    useUndoStore.getState().offerUndo({
      message: "Task deleted",
      autoDismissMs: 3000,
      runUndo: async () => {
        const ins = await insertDailyTask({
          plan_date: planDate,
          id: snapshot.id,
          title: snapshot.title,
          time_slot: snapshot.time_slot,
          time_start: snapshot.time_start,
          time_end: snapshot.time_end,
          status: snapshot.status,
          source: src,
          source_raw_text: snapshot.source_raw_text,
          priority: snapshot.priority,
        });
        if (!ins.ok) {
          setError(ins.error);
          return;
        }
        setTasks((prev) => {
          if (prev.some((x) => x.id === snapshot.id)) return prev;
          return [...prev, snapshot].sort((a, b) =>
            a.created_at < b.created_at ? -1 : 1,
          );
        });
      },
    });
  };

  const handleEditSaved = (id: string, patch: Partial<DailyTaskView>) => {
    setTasks((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    dispatchDailyPlanSynced();
  };

  const doneCount = tasks.filter((t) => isCompletedStatus(t.status)).length;

  return (
    <>
      <section className={`kal-glass-panel rounded-[1.25rem] p-4 sm:p-6 ${className}`}>
        {title ? (
          <h2 className="mb-4 text-lg font-bold text-kal-text">{title}</h2>
        ) : null}

        {loading ? (
          <>
            <div
              role="status"
              aria-live="polite"
              className="mb-5 flex items-center gap-2.5 text-sm font-medium leading-snug text-kal-muted"
            >
              <Loader2
                className="h-4 w-4 shrink-0 animate-spin text-kal-accent/70"
                aria-hidden
              />
              <span>{DAILY_PLAN_LOADING_MESSAGE}</span>
            </div>
            <DailyPlanListSkeleton />
          </>
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

            <ul className="space-y-2.5">
              {tasks.map((t) => {
                const st = t.time_start ? timeDbToInput(t.time_start) : "";
                const et = t.time_end ? timeDbToInput(t.time_end) : "";
                const overlap = overlapIds.has(t.id);
                  const done = isDoneStatus(t.status);
                  const skipped = isSkippedStatus(t.status);
                  const completed = done || skipped;
                  const isDeleting = deletingId === t.id;

                return (
                  <li
                    key={t.id}
                    // `group` enables sm:group-hover to show action buttons on desktop hover
                    className={`group rounded-2xl border px-3 py-3 shadow-sm transition-all ${
                      done
                        ? "border-white/20 bg-white/45 opacity-75 backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/45"
                        : skipped
                          ? "border-white/15 bg-white/25 opacity-60 backdrop-blur-sm dark:border-white/8 dark:bg-zinc-900/30"
                          : "kal-glass-subtle border-white/25 dark:border-white/12"
                    } ${isDeleting ? "pointer-events-none opacity-40" : ""}`}
                  >
                    {/* Layout: checkbox (44px tap) → title/time → badges → edit/delete */}
                    <div className="flex items-start gap-2">
                      {/* Checkbox — min 44×44 touch target, primary fill when done */}
                      <button
                        type="button"
                        role="checkbox"
                        disabled={busyId === t.id || isDeleting || skipped}
                        onClick={() => void toggleDone(t)}
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kal-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:opacity-40 ${
                          done
                            ? "border-kal-accent bg-kal-accent text-white"
                            : skipped
                              ? "border-kal-muted/40 bg-kal-muted/10 text-kal-muted cursor-default"
                              : "border-kal-accent/45 bg-white text-transparent hover:border-kal-accent hover:bg-white dark:border-white/35 dark:bg-zinc-900/90 dark:hover:border-kal-accent/80 dark:hover:bg-zinc-900"
                        }`}
                        aria-checked={completed}
                        aria-label={done ? "Mark as not done" : skipped ? "Skipped" : "Mark as done"}
                      >
                        {busyId === t.id ? (
                          <Loader2
                            className={`h-5 w-5 animate-spin ${done ? "text-white" : "text-kal-accent"}`}
                          />
                        ) : done ? (
                          <Check className="h-5 w-5 text-white" strokeWidth={2.75} />
                        ) : skipped ? (
                          <X className="h-4 w-4 text-kal-muted" strokeWidth={2.5} />
                        ) : null}
                      </button>

                      {/* Task body — title & time first, then badges */}
                      <button
                        type="button"
                        disabled={isDeleting || skipped}
                        onClick={() => setEditingTask(t)}
                        className="min-w-0 flex-1 text-left disabled:pointer-events-none"
                        aria-label={`Edit "${t.title}"`}
                      >
                        <p
                          className={`text-sm font-semibold leading-snug [overflow-wrap:anywhere] ${
                            done
                              ? "text-kal-muted line-through decoration-kal-muted/60"
                              : skipped
                                ? "text-kal-muted/70 line-through decoration-kal-muted/40"
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
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <SourceBadge source={t.source} />
                          {overlap ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                              Overlap
                            </span>
                          ) : null}
                        </div>
                      </button>

                      {/*
                       * Action buttons — compact, anchored right
                       */}
                      <div className="flex shrink-0 items-start gap-0.5 pt-0.5 opacity-90 transition-opacity duration-150 sm:opacity-70 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                        {/* Edit */}
                        <button
                          type="button"
                          onClick={() => setEditingTask(t)}
                          disabled={isDeleting}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-kal-muted/80 transition-colors hover:bg-kal-card-muted hover:text-kal-accent disabled:opacity-40 sm:h-7 sm:w-7"
                          aria-label="Edit task"
                        >
                          <Pencil className="h-[13px] w-[13px]" strokeWidth={2} />
                        </button>
                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => void deleteTaskNow(t)}
                          disabled={isDeleting}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-kal-muted/80 transition-colors hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-40 dark:hover:text-rose-400 sm:h-7 sm:w-7"
                          aria-label="Delete task"
                        >
                          {isDeleting ? (
                            <Loader2 className="h-[13px] w-[13px] animate-spin" />
                          ) : (
                            <Trash2 className="h-[13px] w-[13px]" strokeWidth={2} />
                          )}
                        </button>
                      </div>
                    </div>
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
