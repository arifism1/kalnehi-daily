"use client";

import clsx from "clsx";
import {
  ChevronDown,
  Loader2,
  Pause,
  Pencil,
  Play,
  Square,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { trackMetaTaskCompleted, trackMetaTimerStarted } from "@/lib/analytics";
import { trackActivity } from "@/lib/activity";
import {
  applyOptimisticTaskUpdate,
  undoRestoreTaskUpdate,
} from "@/lib/taskMutations";
import {
  formatElapsedSeconds,
  formatTaskTimeRange,
} from "@/lib/taskTime";
import { finalizeActiveTimerForTask } from "@/lib/timerSession";
import { useHaptic } from "@/hooks/useHaptic";
import { useAuthStore } from "@/store/useAuthStore";
import { useActiveTimerStore } from "@/store/useActiveTimerStore";
import { useUndoStore } from "@/store/useUndoStore";
import type { Microtopic, Task } from "@/store/useTaskStore";
import { useTaskStore } from "@/store/useTaskStore";

export const TASK_STATUS = {
  pending: "pending",
  in_progress: "in_progress",
  completed: "completed",
} as const;

type TaskCardProps = {
  task: Task;
  microtopic: Microtopic;
  appearance?: "default" | "missed";
  onEdit: () => void;
  onDelete: () => void;
  onShiftDay: (deltaDays: number) => void;
  /** Inline name field (quick add) — focused until blur; avoids opening the full sheet first. */
  nameCaptureMode?: boolean;
  onNameCaptureCommit?: (name: string) => void;
};

const LONG_PRESS_MS = 520;

function TaskQuickSheet({
  open,
  title,
  onClose,
  onEdit,
  onRequestDelete,
  onShiftDay,
  onTimerPrimary,
  showTimerAction,
  timerActionLabel,
  timerIcon: TimerIcon,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onEdit: () => void;
  onRequestDelete: () => void;
  onShiftDay: (delta: number) => void;
  onTimerPrimary: () => void;
  showTimerAction: boolean;
  timerActionLabel: string;
  timerIcon?: typeof Play;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close sheet"
        className="absolute inset-0 bg-[var(--kal-overlay)] backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Task actions"
        className="kal-glass-panel relative z-10 w-full max-w-lg rounded-t-[1.25rem] p-5 sm:rounded-[1.25rem]"
      >
        <div className="flex items-start justify-between gap-2 border-b border-kal-border pb-3">
          <p className="min-w-0 break-words text-sm font-semibold text-kal-text [overflow-wrap:anywhere]">
            {title}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-kal-muted hover:bg-kal-card-muted hover:text-kal-text"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onShiftDay(-1);
                onClose();
              }}
              className="flex min-h-[44px] items-center justify-center rounded-xl border border-kal-border bg-kal-card-muted py-2.5 text-xs font-semibold text-kal-text active:bg-kal-border/50"
            >
              One day earlier
            </button>
            <button
              type="button"
              onClick={() => {
                onShiftDay(1);
                onClose();
              }}
              className="flex min-h-[44px] items-center justify-center rounded-xl border border-kal-border bg-kal-card-muted py-2.5 text-xs font-semibold text-kal-text active:bg-kal-border/50"
            >
              One day later
            </button>
          </div>
          {showTimerAction && (
            <button
              type="button"
              onClick={() => {
                onTimerPrimary();
                onClose();
              }}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-kal-accent/30 bg-kal-accent-soft py-3 text-sm font-bold text-kal-accent-dark dark:text-kal-text active:bg-kal-accent/20"
            >
              {TimerIcon ? (
                <TimerIcon
                  className={clsx(
                    "h-4 w-4",
                    TimerIcon !== Pause && "fill-current",
                  )}
                  aria-hidden
                />
              ) : (
                <Play className="h-4 w-4 fill-current" aria-hidden />
              )}
              {timerActionLabel}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onEdit();
              onClose();
            }}
            className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-kal-accent py-3 text-sm font-bold text-kal-accent-foreground shadow-sm hover:bg-kal-accent-hover active:opacity-90"
          >
            Full edit
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onRequestDelete();
            }}
            className="flex min-h-[48px] w-full items-center justify-center rounded-xl border border-[var(--kal-danger-border)] bg-[var(--kal-danger-soft)] py-3 text-sm font-semibold text-[var(--kal-danger-text)] active:opacity-90"
          >
            Delete task
          </button>
        </div>
        <p className="mt-3 text-center text-[10px] text-kal-muted">
          Timer controls stay on the card · This menu moves the target day
        </p>
      </div>
    </div>
  );
}

export function TaskCard({
  task,
  microtopic,
  appearance = "default",
  onEdit,
  onDelete,
  onShiftDay,
  nameCaptureMode = false,
  onNameCaptureCommit,
}: TaskCardProps) {
  const userId = useAuthStore((s) => s.user?.id);
  const haptic = useHaptic();
  const [busy, setBusy] = useState(false);
  const [nameDraft, setNameDraft] = useState(task.name ?? "");
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [tick, setTick] = useState(0);
  const [quickSheetOpen, setQuickSheetOpen] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);

  const activeTaskId = useActiveTimerStore((s) => s.taskId);
  const resumeAt = useActiveTimerStore((s) => s.resumeAt);
  const isThisActive = activeTaskId === task.id;
  const running = isThisActive && resumeAt !== null;
  const pausedHere = isThisActive && resumeAt === null;

  useEffect(() => {
    if (!isThisActive || !running) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [isThisActive, running]);

  useEffect(() => {
    if (!justCompleted) return;
    const t = window.setTimeout(() => setJustCompleted(false), 650);
    return () => window.clearTimeout(t);
  }, [justCompleted]);

  useEffect(() => {
    if (!nameCaptureMode) return;
    setNameDraft(task.name ?? "");
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const el = nameInputRef.current;
        el?.focus();
        el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [nameCaptureMode, task.id]);

  void tick;
  const elapsedDisplay = isThisActive
    ? formatElapsedSeconds(useActiveTimerStore.getState().getElapsed())
    : null;

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const startOrResumeTimer = useCallback(async () => {
    if (!userId || task.status === "completed") return;
    setBusy(true);
    try {
      const st = useActiveTimerStore.getState();
      if (st.taskId && st.taskId !== task.id) {
        await finalizeActiveTimerForTask(userId, st.taskId);
      }

      if (task.status === "pending") {
        await applyOptimisticTaskUpdate(
          task.id,
          {
            status: TASK_STATUS.in_progress,
            time_spent_seconds: task.time_spent_seconds ?? 0,
          },
          userId,
        );
        useActiveTimerStore
          .getState()
          .start(task.id, task.time_spent_seconds ?? 0);
        trackMetaTimerStarted();
        return;
      }

      if (task.status === "in_progress") {
        const cur = useActiveTimerStore.getState();
        if (cur.taskId !== task.id) {
          cur.start(task.id, task.time_spent_seconds ?? 0);
          trackMetaTimerStarted();
        } else if (!cur.resumeAt) {
          cur.resume();
        }
      }
    } finally {
      setBusy(false);
    }
  }, [userId, task]);

  const pauseTimer = useCallback(() => {
    useActiveTimerStore.getState().pause();
    setTick((t) => t + 1);
  }, []);

  const endTimerSession = useCallback(async () => {
    if (!userId || !isThisActive) return;
    setBusy(true);
    try {
      await finalizeActiveTimerForTask(userId, task.id);
      setTick((t) => t + 1);
    } finally {
      setBusy(false);
    }
  }, [userId, task.id, isThisActive]);

  const completeTask = useCallback(async () => {
    if (!userId) return;
    setBusy(true);
    try {
      const st = useActiveTimerStore.getState();
      let secs = task.time_spent_seconds ?? 0;
      if (st.taskId === task.id) {
        const r = await finalizeActiveTimerForTask(userId, task.id);
        secs = r.totalSeconds;
      }
      setJustCompleted(true);
      haptic("medium");
      const before = { ...useTaskStore.getState().tasks[task.id]! };
      const res = await applyOptimisticTaskUpdate(
        task.id,
        {
          status: TASK_STATUS.completed,
          time_spent_seconds: secs,
        },
        userId,
      );
      if (res.ok) {
        trackMetaTaskCompleted();
        trackActivity("task_completed", { feature: "tasks", metadata: { task_id: task.id, task_title: task.name ?? task.id } });
        useUndoStore.getState().offerUndo({
          message: "Task completed",
          runUndo: async () => {
            await undoRestoreTaskUpdate(before, res.outboxId, userId);
          },
        });
      }
    } finally {
      setBusy(false);
    }
  }, [userId, task]);

  const uncheckTask = useCallback(async () => {
    if (!userId) return;
    setBusy(true);
    try {
      const st = useActiveTimerStore.getState();
      if (st.taskId === task.id) st.stop();
      const before = { ...useTaskStore.getState().tasks[task.id]! };
      const res = await applyOptimisticTaskUpdate(
        task.id,
        {
          status: TASK_STATUS.pending,
          time_spent_seconds: 0,
        },
        userId,
      );
      if (res.ok) {
        useUndoStore.getState().offerUndo({
          message: "Marked as not done",
          runUndo: async () => {
            await undoRestoreTaskUpdate(before, res.outboxId, userId);
          },
        });
      }
    } finally {
      setBusy(false);
    }
  }, [userId, task]);

  const onCheckboxChange = useCallback(async () => {
    if (busy) return;
    if (task.status === "completed") {
      await uncheckTask();
      return;
    }
    await completeTask();
  }, [busy, task.status, completeTask, uncheckTask]);

  const done = task.status === "completed";
  const inProgress = task.status === "in_progress";
  const title = task.name?.trim() || microtopic.microtopic || "Untitled target";
  const hasSyllabusLink = Boolean(task.microtopic_id);
  const showMeta =
    hasSyllabusLink &&
    (Boolean(microtopic.subject?.trim()) || Boolean(microtopic.chapter?.trim()));
  const timeRange = formatTaskTimeRange(task.start_time, task.end_time);
  const est =
    task.estimated_time_minutes != null && task.estimated_time_minutes > 0
      ? `${task.estimated_time_minutes} min`
      : null;

  const scheduleMeta = [timeRange, est].filter(Boolean).join(" · ");

  const openQuickSheet = useCallback(() => setQuickSheetOpen(true), []);

  const secondaryMetaText = (() => {
    const parts: string[] = [];
    if (showMeta) {
      parts.push(
        `${microtopic.subject}${microtopic.chapter ? ` · ${microtopic.chapter}` : ""}`,
      );
    }
    if (scheduleMeta) parts.push(scheduleMeta);
    parts.push(task.assigned_date);
    return parts.join(" · ");
  })();

  const onBodyPointerDown = () => {
    longPressFired.current = false;
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      openQuickSheet();
    }, LONG_PRESS_MS);
  };
  const onBodyPointerEnd = () => {
    clearLongPress();
  };

  const onBodyClick = (e: React.MouseEvent) => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    e.preventDefault();
    openQuickSheet();
  };

  return (
    <div
      className={clsx(
        "group rounded-xl border px-2 py-1.5 kal-shadow-card transition-all duration-200 ease-out sm:rounded-[1rem] sm:px-2.5 sm:py-2 md:px-3 md:py-2.5",
        appearance === "missed"
          ? "border-amber-300/60 bg-amber-50/80 backdrop-blur-sm dark:border-amber-500/30 dark:bg-[rgba(52,40,22,0.90)] dark:ring-1 dark:ring-white/[0.05]"
          : "kal-glass-subtle",
        done && "opacity-[0.95]",
      )}
    >
      <TaskQuickSheet
        open={quickSheetOpen}
        title={title}
        onClose={() => setQuickSheetOpen(false)}
        onEdit={onEdit}
        onRequestDelete={() => {
          setQuickSheetOpen(false);
          onDelete();
        }}
        onShiftDay={(d) => onShiftDay(d)}
        showTimerAction={!done}
        timerIcon={running ? Pause : Play}
        timerActionLabel={
          running
            ? "Pause timer"
            : pausedHere
              ? "Resume timer"
              : inProgress
                ? "Resume timer"
                : "Start timer"
        }
        onTimerPrimary={() => {
          if (running) pauseTimer();
          else void startOrResumeTimer();
        }}
      />

      <div className="flex flex-col gap-1.5 sm:min-h-[5.25rem] sm:flex-row sm:items-center sm:gap-2.5 md:gap-2.5">
        <div className="flex min-w-0 flex-1 items-start gap-1.5 sm:gap-2">
          <label
            className="flex shrink-0 cursor-pointer items-center py-0.5 pt-px sm:pt-0.5 md:pt-0"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="sr-only">Mark conquered</span>
            <input
              type="checkbox"
              checked={done}
              disabled={busy}
              onChange={() => void onCheckboxChange()}
              className={clsx(
                "size-4 shrink-0 rounded border border-kal-border bg-kal-card-muted text-kal-accent accent-kal-accent transition-all duration-200 focus:ring-2 focus:ring-kal-accent/40 focus:ring-offset-1 focus:ring-offset-kal-card sm:size-[18px] sm:rounded-md md:size-5",
                done && "border-kal-accent/50 bg-kal-accent-soft",
                justCompleted &&
                  "animate-[completion-pop_0.55s_ease-out_both] ring-2 ring-kal-accent ring-offset-2 ring-offset-kal-card",
              )}
            />
          </label>

          <div className="min-w-0 flex-1">
          {nameCaptureMode ? (
            <input
              ref={nameInputRef}
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  nameInputRef.current?.blur();
                }
              }}
              onBlur={() => onNameCaptureCommit?.(nameDraft.trim())}
              placeholder="Task name — start typing"
              autoComplete="off"
              className="w-full min-w-0 rounded-md border border-kal-border bg-kal-card-muted px-2 py-1.5 text-xs font-semibold text-kal-text outline-none placeholder:text-kal-muted [overflow-wrap:anywhere] focus-visible:ring-2 focus-visible:ring-kal-accent/40 sm:rounded-lg sm:px-2.5 sm:text-sm"
              aria-label="Task name"
            />
          ) : (
            <>
              <div
                role="button"
                tabIndex={0}
                onPointerDown={onBodyPointerDown}
                onPointerUp={onBodyPointerEnd}
                onPointerLeave={onBodyPointerEnd}
                onPointerCancel={onBodyPointerEnd}
                onClick={onBodyClick}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openQuickSheet();
                  }
                }}
                className={clsx(
                  "rounded-md px-0.5 py-0.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-kal-accent/35",
                  !done && "cursor-pointer hover:bg-kal-card-muted active:bg-kal-border/30",
                )}
              >
                <div className="flex min-w-0 items-start gap-1.5 sm:gap-2 sm:items-center">
                  <p
                    className={clsx(
                      "min-w-0 flex-1 text-xs font-semibold leading-snug sm:text-[13px] sm:leading-snug md:text-sm md:leading-tight",
                      "line-clamp-2 sm:truncate sm:line-clamp-none",
                      done ? "text-kal-muted line-through" : "text-kal-text",
                    )}
                  >
                    {title}
                  </p>
                  {busy && (
                    <Loader2 className="h-3 w-3 shrink-0 animate-spin text-kal-accent sm:h-3.5 sm:w-3.5" />
                  )}
                  {done && (
                    <span className="shrink-0 rounded border border-kal-accent/35 bg-kal-accent/10 px-1 py-px text-[7px] font-bold uppercase tracking-[0.1em] text-kal-accent/95 sm:px-1.5 sm:text-[8px] sm:tracking-[0.12em]">
                      Conquered
                    </span>
                  )}
                  {appearance === "missed" && !done && (
                    <span className="shrink-0 rounded border border-amber-600/45 bg-amber-100/90 px-1 py-px text-[7px] font-bold uppercase tracking-[0.1em] text-amber-900 sm:px-1.5 sm:text-[8px] sm:tracking-[0.12em] dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-100">
                      Carry
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-px flex min-w-0 items-center gap-1 sm:mt-0.5 sm:gap-1.5">
                <p
                  className="min-w-0 flex-1 truncate text-[9px] leading-snug tabular-nums text-kal-text-secondary/80 sm:text-[10px] md:text-[11px]"
                  title={secondaryMetaText}
                >
                  {secondaryMetaText}
                </p>

                {!done && (
                  <div
                    className="flex shrink-0 items-center gap-0.5"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {!isThisActive && (
                      <button
                        type="button"
                        title="Start timer"
                        onClick={() => void startOrResumeTimer()}
                        disabled={busy}
                        className="flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-kal-accent/25 bg-kal-accent/10 text-kal-accent transition-colors hover:bg-kal-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kal-accent/40 disabled:opacity-40 sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0"
                      >
                        <Play className="h-3 w-3 fill-current sm:h-3.5 sm:w-3.5" aria-hidden />
                      </button>
                    )}
                    {isThisActive && running && (
                      <>
                        <button
                          type="button"
                          title={`Pause (${elapsedDisplay ?? "0:00"})`}
                          onClick={() => pauseTimer()}
                          disabled={busy}
                          className="flex h-9 min-w-9 min-h-[44px] items-center justify-center gap-0.5 rounded-lg bg-kal-accent px-1.5 text-kal-accent-foreground shadow-sm shadow-kal-accent/25 transition-colors hover:bg-kal-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kal-accent/50 disabled:opacity-40 sm:h-8 sm:min-h-0 sm:min-w-8"
                        >
                          <Pause className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden />
                          <span className="max-w-[2.75rem] truncate text-[8px] font-bold tabular-nums leading-none sm:text-[9px] md:text-[10px]">
                            {elapsedDisplay}
                          </span>
                        </button>
                        <button
                          type="button"
                          title="End session & save time"
                          onClick={() => void endTimerSession()}
                          disabled={busy}
                          className="flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-rose-500/35 bg-rose-950/35 text-rose-200 transition-colors hover:bg-rose-950/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/35 disabled:opacity-40 sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0"
                        >
                          <Square className="h-2.5 w-2.5 fill-current sm:h-3 sm:w-3" aria-hidden />
                        </button>
                      </>
                    )}
                    {isThisActive && pausedHere && (
                      <>
                        <button
                          type="button"
                          title={`Resume (${elapsedDisplay ?? "0:00"})`}
                          onClick={() => void startOrResumeTimer()}
                          disabled={busy}
                          className="flex h-9 min-w-9 min-h-[44px] items-center justify-center gap-0.5 rounded-lg bg-amber-600 px-1.5 text-amber-950 shadow-sm shadow-amber-950/25 transition-colors hover:bg-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/45 disabled:opacity-40 sm:h-8 sm:min-h-0 sm:min-w-8"
                        >
                          <Play className="h-3 w-3 shrink-0 fill-current sm:h-3.5 sm:w-3.5" aria-hidden />
                          <span className="max-w-[2.75rem] truncate text-[8px] font-bold tabular-nums leading-none sm:text-[9px] md:text-[10px]">
                            {elapsedDisplay}
                          </span>
                        </button>
                        <button
                          type="button"
                          title="End session & save time"
                          onClick={() => void endTimerSession()}
                          disabled={busy}
                          className="flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-rose-500/35 bg-rose-950/35 text-rose-200 transition-colors hover:bg-rose-950/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/35 disabled:opacity-40 sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0"
                        >
                          <Square className="h-2.5 w-2.5 fill-current sm:h-3 sm:w-3" aria-hidden />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
          </div>
        </div>

        <div
          className={clsx(
            "flex shrink-0 items-center gap-px sm:gap-0.5",
            "justify-end border-t border-kal-border pt-1.5 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-2.5 md:pl-2.5",
          )}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-kal-muted transition-colors hover:bg-kal-card-muted hover:text-kal-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kal-accent/30 sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0"
            aria-label="Edit task"
          >
            <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-rose-400/90 transition-colors hover:bg-rose-950/40 hover:text-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30 sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0"
            aria-label="Delete task"
          >
            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openQuickSheet();
            }}
            className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-kal-muted transition-colors hover:bg-kal-card-muted hover:text-kal-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kal-border sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0"
            aria-label="More actions"
          >
            <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
