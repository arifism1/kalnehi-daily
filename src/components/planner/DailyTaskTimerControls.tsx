"use client";

import { Loader2, Pause, Play, Square } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { updateDailyTaskWorkedTime, type DailyTaskView } from "@/actions/dailyPlan";
import { trackMetaTimerStarted } from "@/lib/analytics";
import { plannedMinutesFromSlot } from "@/lib/dailyPlanTime";
import { surfaceErrorForUi } from "@/lib/userFacingErrors";
import { useDailyTaskTimerStore } from "@/store/useDailyTaskTimerStore";

function formatElapsed(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function workedPlannedLabel(
  actual: number,
  planned: number | null,
): { line: string; isTracked: boolean; pct: number | null } {
  if (actual <= 0) {
    return { line: "Not tracked", isTracked: false, pct: null };
  }
  if (planned != null && planned > 0) {
    const pct = Math.min(999, Math.round((actual / planned) * 100));
    return {
      line: `Worked ${actual} min / ${planned} min planned (${pct}%)`,
      isTracked: true,
      pct,
    };
  }
  return { line: `Worked ${actual} min`, isTracked: true, pct: null };
}

type DailyTaskTimerControlsProps = {
  task: DailyTaskView;
  planDate: string;
  today: string;
  /** When set, flushes another task's running timer (minutes delta) before starting this one. */
  onBeforeStartOther: (previousTaskId: string) => Promise<void>;
  onWorkedSaved: (taskId: string, nextTotalMinutes: number) => void;
  onError: (message: string) => void;
  /** True while this task is saving timer / server action. */
  busy: boolean;
  /** True while any task is doing a timer-related save (e.g. flushing another task). */
  anyOperationBusy: boolean;
  setBusy: (id: string | null) => void;
};

export function DailyTaskTimerControls({
  task,
  planDate,
  today,
  onBeforeStartOther,
  onWorkedSaved,
  onError,
  busy,
  anyOperationBusy,
  setBusy,
}: DailyTaskTimerControlsProps) {
  const taskId = task.id;
  const isToday = planDate === today;
  const done = task.status === "done";
  const skipped = task.status === "skipped";
  const activeId = useDailyTaskTimerStore((s) => s.taskId);
  const resumeAt = useDailyTaskTimerStore((s) => s.resumeAt);
  const isThisActive = activeId === taskId;
  const isRunning = isThisActive && resumeAt != null;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isThisActive) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [isThisActive]);

  void tick;
  const displaySeconds = isThisActive
    ? useDailyTaskTimerStore.getState().getElapsed()
    : (task.actual_worked_minutes ?? 0) * 60;

  const planned = plannedMinutesFromSlot(task.time_start, task.time_end);
  const actual = task.actual_worked_minutes ?? 0;
  const summary = workedPlannedLabel(actual, planned);

  const stopAndSave = useCallback(async () => {
    const st = useDailyTaskTimerStore.getState();
    if (st.taskId !== taskId) return;
    const atStart = st.workMinutesAtSessionStart;
    const sec = st.getElapsed();
    st.stop();
    const add = Math.max(0, Math.round(sec / 60) - atStart);
    if (add === 0) {
      onWorkedSaved(taskId, task.actual_worked_minutes ?? 0);
      return;
    }
    setBusy(taskId);
    try {
      const res = await updateDailyTaskWorkedTime(taskId, add);
      if (!res.ok) {
        onError(surfaceErrorForUi(res.error));
        return;
      }
      onWorkedSaved(taskId, res.totalMinutes);
    } catch {
      onError("Could not save time.");
    } finally {
      setBusy(null);
    }
  }, [onError, onWorkedSaved, setBusy, task.actual_worked_minutes, taskId]);

  const handleStart = async () => {
    if (done || skipped || !isToday) return;
    const other = useDailyTaskTimerStore.getState().taskId;
    if (other && other !== taskId) {
      setBusy(other);
      try {
        await onBeforeStartOther(other);
      } finally {
        setBusy(null);
      }
    }
    useDailyTaskTimerStore.getState().start(taskId, task.actual_worked_minutes ?? 0);
    trackMetaTimerStarted();
  };

  const handleStop = () => {
    void stopAndSave();
  };

  const showInteractiveTimer = isToday && !done && !skipped;
  const showReadOnly = !isToday || done || skipped;

  return (
    <div className="mt-2 space-y-1.5">
      {showReadOnly ? (
        <p
          className={`text-[11px] font-medium leading-snug ${
            summary.isTracked ? "text-kal-muted" : "text-kal-muted/70"
          }`}
        >
          {summary.isTracked ? summary.line : `Worked vs planned: ${summary.line}`}
        </p>
      ) : (
        <>
          <p
            className={`text-[11px] font-medium leading-snug ${
              summary.isTracked ? "text-kal-muted" : "text-kal-muted/70"
            }`}
          >
            {summary.isTracked
              ? summary.line
              : `Worked vs planned: ${summary.line} (0%)`}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="min-w-[3.25rem] font-mono text-xs font-semibold text-kal-text tabular-nums"
              aria-live="polite"
            >
              {formatElapsed(isThisActive ? displaySeconds : (task.actual_worked_minutes ?? 0) * 60)}
            </span>
            {!isThisActive ? (
              <button
                type="button"
                disabled={busy || anyOperationBusy}
                onClick={() => void handleStart()}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-kal-accent/40 bg-kal-accent/10 px-2.5 text-xs font-semibold text-kal-accent transition-colors hover:bg-kal-accent/20 disabled:opacity-50"
                aria-label="Start timer"
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                Start
              </button>
            ) : isRunning ? (
              <>
                <button
                  type="button"
                  onClick={() => useDailyTaskTimerStore.getState().pause()}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-kal-border/80 bg-kal-card-muted/50 px-2.5 text-xs font-semibold text-kal-text"
                  aria-label="Pause timer"
                >
                  <Pause className="h-3.5 w-3.5" />
                  Pause
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleStop}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-kal-border/80 px-2.5 text-xs font-semibold text-kal-muted transition-colors hover:border-orange-500/50 hover:text-orange-700 dark:hover:text-orange-300"
                  aria-label="Stop and save time"
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Square className="h-3.5 w-3.5" />
                  )}
                  Stop
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    useDailyTaskTimerStore.getState().resume();
                    trackMetaTimerStarted();
                  }}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-kal-accent/40 bg-kal-accent/10 px-2.5 text-xs font-semibold text-kal-accent"
                  aria-label="Resume timer"
                >
                  <Play className="h-3.5 w-3.5" />
                  Resume
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleStop}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-kal-border/80 px-2.5 text-xs font-semibold text-kal-muted transition-colors hover:border-orange-500/50 hover:text-orange-700 dark:hover:text-orange-300"
                  aria-label="Stop and save time"
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Square className="h-3.5 w-3.5" />
                  )}
                  Stop
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** Day-level summary: done count + worked vs planned totals. */
export function dailyPlanDaySummary(tasks: DailyTaskView[]): {
  line: string;
} {
  const total = tasks.length;
  const done = tasks.filter(
    (t) => t.status === "done" || t.status === "skipped",
  ).length;
  let sumWorked = 0;
  let sumPlanned = 0;
  let hasPlanned = false;
  for (const t of tasks) {
    const a = t.actual_worked_minutes ?? 0;
    sumWorked += a;
    const p = plannedMinutesFromSlot(t.time_start, t.time_end);
    if (p != null && p > 0) {
      hasPlanned = true;
      sumPlanned += p;
    }
  }
  if (sumWorked === 0) {
    return {
      line: hasPlanned
        ? `${done} / ${total} done · Worked vs planned: Not tracked (0%)`
        : `${done} / ${total} done · Worked vs planned: Not tracked`,
    };
  }
  if (hasPlanned && sumPlanned > 0) {
    const pct = Math.min(999, Math.round((sumWorked / sumPlanned) * 100));
    return {
      line: `${done} / ${total} done · ${sumWorked} min worked / ${sumPlanned} min planned (${pct}%)`,
    };
  }
  return {
    line: `${done} / ${total} done · ${sumWorked} min worked`,
  };
}
