"use client";

import clsx from "clsx";
import { Pause, Play, Square } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { CircularProgressRing } from "@/components/ui/CircularProgressRing";
import { TASK_STATUS } from "@/components/task/TaskCard";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useRefreshTasksOnHomeFocus } from "@/hooks/useRefreshTasksOnHomeFocus";
import { quickCreatePlannedTask } from "@/lib/quickTaskCreate";
import { applyOptimisticTaskUpdate } from "@/lib/taskMutations";
import { formatElapsedSeconds } from "@/lib/taskTime";
import { finalizeActiveTimerForTask } from "@/lib/timerSession";
import { useAuthStore } from "@/store/useAuthStore";
import { useActiveTimerStore } from "@/store/useActiveTimerStore";
import { useTaskStore } from "@/store/useTaskStore";
import type { Task } from "@/store/useTaskStore";

import { EngineCard, EngineHero } from "./EngineHero";

const PRESETS = [
  { label: "25 min", short: "Pomodoro", work: 25 * 60 },
  { label: "50 min", short: "Deep", work: 50 * 60 },
  { label: "15 min", short: "Sprint", work: 15 * 60 },
] as const;

function taskLabel(
  t: Task,
  microRecord: Record<string, { microtopic?: string | null }>,
) {
  const m = t.microtopic_id ? microRecord[t.microtopic_id] : null;
  return (t.name?.trim() || m?.microtopic || "Task").trim();
}

export function TimerEngineClient() {
  useRefreshTasksOnHomeFocus();
  const userId = useAuthStore((s) => s.user?.id);
  const tasksRecord = useTaskStore((s) => s.tasks);
  const microRecord = useTaskStore((s) => s.microtopics);
  const today = useCalendarDate();

  const idPreview = useId().replace(/:/g, "");
  const idSession = useId().replace(/:/g, "");
  const gidPreview = `tp-${idPreview}`;
  const gidSession = `ts-${idSession}`;

  const [taskInput, setTaskInput] = useState("");
  const [pickedTaskId, setPickedTaskId] = useState<string | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [customSec, setCustomSec] = useState(25 * 60);
  const [focusTarget, setFocusTarget] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  const taskList = useMemo(() => {
    return Object.values(tasksRecord)
      .filter((t) => t.status !== "completed")
      .sort((a, b) => a.assigned_date.localeCompare(b.assigned_date));
  }, [tasksRecord]);

  const filteredSuggestions = useMemo(() => {
    const q = taskInput.trim().toLowerCase();
    if (!q) return taskList.slice(0, 8);
    return taskList
      .filter((t) => {
        const label =
          `${t.assigned_date} · ${taskLabel(t, microRecord)}`.toLowerCase();
        return (
          label.includes(q) ||
          taskLabel(t, microRecord).toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [taskList, taskInput, microRecord]);

  const matchedPreset = useMemo(
    () => PRESETS.find((p) => p.work === customSec) ?? null,
    [customSec],
  );

  useEffect(() => {
    if (!pickedTaskId) return;
    const t = tasksRecord[pickedTaskId];
    if (!t) {
      setPickedTaskId(null);
      return;
    }
    const line = `${t.assigned_date} · ${taskLabel(t, microRecord)}`;
    if (line.toLowerCase() !== taskInput.trim().toLowerCase()) {
      setPickedTaskId(null);
    }
  }, [taskInput, pickedTaskId, tasksRecord, microRecord]);

  const activeId = useActiveTimerStore((s) => s.taskId);
  const isRunning = useActiveTimerStore((s) => s.resumeAt != null);
  const pausedHere = Boolean(activeId && !isRunning);
  const prevActiveIdRef = useRef<string | null>(null);

  useEffect(() => {
    const prev = prevActiveIdRef.current;
    if (prev && !activeId) {
      setFocusTarget(null);
    }
    prevActiveIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    if (!activeId || !isRunning) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [activeId, isRunning]);

  const elapsed = useMemo(() => {
    void tick;
    const st = useActiveTimerStore.getState();
    if (!st.taskId) return 0;
    return st.getElapsed();
  }, [tick, activeId]);

  const activeTask = activeId ? tasksRecord[activeId] : null;
  const activeTaskTitle = activeTask
    ? taskLabel(activeTask, microRecord)
    : null;
  const activeTaskLine = activeTask
    ? `${activeTask.assigned_date} · ${taskLabel(activeTask, microRecord)}`
    : null;

  const remainingSec =
    focusTarget != null && focusTarget > 0
      ? Math.max(0, focusTarget - elapsed)
      : null;

  const commitTimerToServer = useCallback(
    async (taskId: string) => {
      if (!userId) return;
      await finalizeActiveTimerForTask(userId, taskId);
    },
    [userId],
  );

  const startLinked = async (task: Task) => {
    if (!userId) return;
    const st = useActiveTimerStore.getState();
    if (st.taskId && st.taskId !== task.id) {
      await commitTimerToServer(st.taskId);
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
    } else if (task.status === "in_progress") {
      const cur = useActiveTimerStore.getState();
      if (cur.taskId !== task.id) {
        cur.start(task.id, task.time_spent_seconds ?? 0);
      } else if (!cur.resumeAt) {
        cur.resume();
      }
    } else {
      useActiveTimerStore.getState().start(task.id, task.time_spent_seconds ?? 0);
    }
  };

  const stopAndSave = async () => {
    if (!activeId || !userId) return;
    await commitTimerToServer(activeId);
    setTick((n) => n + 1);
  };

  const resolveTaskForTimer = useCallback(async (): Promise<Task | null> => {
    if (!userId) return null;
    if (pickedTaskId) {
      const t = tasksRecord[pickedTaskId];
      if (t) return t;
    }
    const q = taskInput.trim();
    if (!q) return null;
    const lower = q.toLowerCase();
    const exact = taskList.find(
      (t) => taskLabel(t, microRecord).toLowerCase() === lower,
    );
    if (exact) return exact;
    const lineMatch = taskList.find((t) => {
      const line = `${t.assigned_date} · ${taskLabel(t, microRecord)}`;
      return line.toLowerCase() === lower;
    });
    if (lineMatch) return lineMatch;
    setCreatingTask(true);
    try {
      const r = await quickCreatePlannedTask(userId, today, {
        name: q,
        start_time: null,
      });
      if (!r.ok) return null;
      return useTaskStore.getState().tasks[r.id] ?? null;
    } finally {
      setCreatingTask(false);
    }
  }, [
    userId,
    pickedTaskId,
    tasksRecord,
    taskInput,
    taskList,
    microRecord,
    today,
  ]);

  const handleStart = async () => {
    const task = await resolveTaskForTimer();
    if (!task) return;
    setFocusTarget(customSec);
    void startLinked(task);
  };

  const ringProgress =
    focusTarget != null && focusTarget > 0
      ? Math.min(100, (elapsed / focusTarget) * 100)
      : 0;

  const blockMinutes = Math.max(1, Math.round(customSec / 60));

  return (
    <div className="space-y-6">
      <EngineHero
        eyebrow="Focus"
        title="Timer"
        description="Pick a block length, link a task, then start — elapsed time logs to your task. Presets set duration only; press Start when ready."
      />

      <EngineCard title="Set up focus block">
        <div className="space-y-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-kal-text-secondary sm:text-[11px] sm:tracking-[0.2em]">
              Block length
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {PRESETS.map((p) => {
                const selected = matchedPreset?.work === p.work;
                return (
                  <button
                    key={p.work}
                    type="button"
                    onClick={() => setCustomSec(p.work)}
                    className={clsx(
                      "rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors duration-200",
                      selected
                        ? "border-kal-accent bg-kal-accent-soft text-kal-accent shadow-sm dark:border-red-500/50 dark:bg-red-950/30 dark:text-red-100"
                        : "border-kal-border bg-kal-card-muted text-kal-text hover:border-kal-accent/35 hover:bg-kal-accent-soft/60 dark:border-slate-600 dark:bg-slate-900/80 dark:text-zinc-200",
                    )}
                  >
                    <span className="tabular-nums">{p.label}</span>
                    <span className="ml-1.5 font-normal opacity-80">
                      ({p.short})
                    </span>
                  </button>
                );
              })}
              <label className="ml-0 flex items-center gap-2 rounded-full border border-dashed border-kal-border px-3 py-2 dark:border-slate-600">
                <span className="text-xs font-medium text-kal-text-secondary">
                  Custom
                </span>
                <input
                  type="number"
                  min={1}
                  max={240}
                  value={blockMinutes}
                  onChange={(e) => {
                    const m = Number(e.target.value);
                    if (!Number.isFinite(m) || m <= 0) return;
                    setCustomSec(m * 60);
                  }}
                  className="w-12 rounded-lg border border-kal-border bg-kal-input-bg px-2 py-1 text-center text-sm font-semibold tabular-nums text-kal-text focus:border-kal-accent focus:outline-none focus:ring-2 focus:ring-kal-accent/20 dark:border-slate-700 dark:bg-slate-950/80 dark:text-white"
                  aria-label="Custom block length in minutes"
                />
                <span className="text-xs text-kal-text-secondary">min</span>
              </label>
            </div>
          </div>

          <div className="relative border-t border-kal-border pt-6 dark:border-slate-700/80">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-kal-text-secondary sm:text-[11px] sm:tracking-[0.2em]">
              Link to task
            </p>
            <input
              type="text"
              value={taskInput}
              onChange={(e) => {
                setTaskInput(e.target.value);
                setSuggestOpen(true);
              }}
              onFocus={() => setSuggestOpen(true)}
              onBlur={() => {
                window.setTimeout(() => setSuggestOpen(false), 180);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setSuggestOpen(false);
                  return;
                }
                if (e.key === "Enter" && taskInput.trim() && !creatingTask) {
                  e.preventDefault();
                  void handleStart();
                }
              }}
              placeholder="Type a task or pick from your list…"
              autoComplete="off"
              className="mt-3 w-full rounded-xl border border-kal-border bg-kal-input-bg px-3 py-3 text-sm text-kal-text placeholder:text-kal-text-secondary placeholder:opacity-90 focus:border-kal-accent focus:outline-none focus:ring-2 focus:ring-kal-accent/20 dark:border-slate-700 dark:bg-slate-950/80 dark:text-white dark:placeholder:text-zinc-400 dark:focus:border-kal-accent/50"
              aria-autocomplete="list"
              aria-expanded={suggestOpen && filteredSuggestions.length > 0}
            />
            {suggestOpen && filteredSuggestions.length > 0 ? (
              <ul
                role="listbox"
                className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-kal-border bg-kal-card py-1 kal-shadow-card dark:border-slate-600 dark:bg-slate-900"
              >
                {filteredSuggestions.map((t) => {
                  const line = `${t.assigned_date} · ${taskLabel(t, microRecord)}`;
                  return (
                    <li key={t.id} role="option">
                      <button
                        type="button"
                        className="w-full px-3 py-2.5 text-left text-sm text-kal-text hover:bg-kal-card-muted dark:text-zinc-200 dark:hover:bg-slate-800"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setPickedTaskId(t.id);
                          setTaskInput(line);
                          setSuggestOpen(false);
                        }}
                      >
                        {line}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            <p className="mt-1.5 text-[11px] leading-relaxed text-kal-text-secondary">
              New name creates a task for today — then the timer links to it.
            </p>
          </div>

          {!activeId ? (
            <div className="flex flex-col items-stretch gap-4 rounded-2xl border border-kal-border/80 bg-kal-card-muted/50 p-4 sm:flex-row sm:items-center dark:border-slate-700/80 dark:bg-slate-950/40">
              <CircularProgressRing
                percent={0}
                gradientId={gidPreview}
                size={112}
                strokeWidth={8}
                className="mx-auto shrink-0 sm:mx-0"
                trackClassName="text-slate-200 dark:text-slate-600"
              >
                <span className="text-sm font-bold tabular-nums text-kal-text">
                  {blockMinutes}
                  <span className="text-xs font-semibold text-kal-muted">
                    {" "}
                    min
                  </span>
                </span>
              </CircularProgressRing>
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="text-sm font-semibold text-kal-text">
                  Next focus block
                </p>
                <p className="mt-1 text-xs leading-relaxed text-kal-text-secondary">
                  Ring fills as you work toward this target. Press Start when
                  you&apos;re ready.
                </p>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            disabled={!taskInput.trim() || creatingTask}
            onClick={() => void handleStart()}
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-kal-accent px-4 text-sm font-semibold text-kal-accent-foreground shadow-sm transition-transform duration-200 hover:bg-kal-accent-hover enabled:motion-safe:active:scale-[0.99] disabled:opacity-40 motion-reduce:enabled:active:scale-100 sm:w-auto"
          >
            <Play className="h-4 w-4" />
            {creatingTask ? "Creating…" : "Start linked timer"}
          </button>
        </div>
      </EngineCard>

      <EngineCard title="Active session">
        {activeId ? (
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-8">
            <CircularProgressRing
              percent={ringProgress}
              gradientId={gidSession}
              size={176}
              strokeWidth={10}
              className="shrink-0"
            >
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-kal-muted sm:text-[10px]">
                  Elapsed
                </span>
                <span
                  className={clsx(
                    "text-3xl font-bold tabular-nums text-kal-accent sm:text-4xl",
                    isRunning && "motion-safe:animate-pulse",
                  )}
                >
                  {formatElapsedSeconds(elapsed)}
                </span>
                {remainingSec != null ? (
                  <span className="mt-1 text-[11px] font-medium tabular-nums text-kal-text-secondary">
                    {formatElapsedSeconds(remainingSec)} left
                  </span>
                ) : null}
              </div>
            </CircularProgressRing>

            <div className="min-w-0 flex-1 space-y-4 text-center sm:text-left">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-kal-text-secondary">
                  Linked task
                </p>
                <p className="mt-1 text-base font-semibold leading-snug text-kal-text">
                  {activeTaskTitle ?? "Task"}
                </p>
                {activeTaskLine ? (
                  <p className="mt-0.5 text-xs text-kal-muted">{activeTaskLine}</p>
                ) : null}
              </div>

              {focusTarget != null && focusTarget > 0 ? (
                <p className="text-xs text-kal-text-secondary">
                  Target block{" "}
                  <span className="font-semibold tabular-nums text-kal-text">
                    {Math.round(focusTarget / 60)} min
                  </span>
                  {ringProgress >= 100 ? (
                    <span className="text-kal-accent"> · Target reached</span>
                  ) : null}
                </p>
              ) : null}

              <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                {isRunning && (
                  <button
                    type="button"
                    onClick={() => {
                      useActiveTimerStore.getState().pause();
                      setTick((n) => n + 1);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-kal-accent px-4 py-2.5 text-sm font-semibold text-kal-accent-foreground transition-colors hover:bg-kal-accent-hover"
                  >
                    <Pause className="h-4 w-4" />
                    Pause
                  </button>
                )}
                {pausedHere && (
                  <button
                    type="button"
                    onClick={() => {
                      useActiveTimerStore.getState().resume();
                      setTick((n) => n + 1);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-amber-950"
                  >
                    <Play className="h-4 w-4" />
                    Resume
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void stopAndSave()}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-800 hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-100 dark:hover:bg-rose-950/60"
                >
                  <Square className="h-4 w-4" />
                  End &amp; log session
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-kal-text-secondary">
            No active timer — choose a block length, link a task, and press
            Start. Time accrues to{" "}
            <span className="font-medium text-kal-text">time spent</span> on the
            task.
          </p>
        )}
      </EngineCard>
    </div>
  );
}
