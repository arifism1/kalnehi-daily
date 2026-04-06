"use client";

import { Pause, Play, Square } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

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
  { label: "Pomodoro 25", work: 25 * 60 },
  { label: "Deep 50", work: 50 * 60 },
  { label: "Sprint 15", work: 15 * 60 },
] as const;

function taskLabel(t: Task, microRecord: Record<string, { microtopic?: string | null }>) {
  const m = t.microtopic_id ? microRecord[t.microtopic_id] : null;
  return (t.name?.trim() || m?.microtopic || "Task").trim();
}

export function TimerEngineClient() {
  useRefreshTasksOnHomeFocus();
  const userId = useAuthStore((s) => s.user?.id);
  const tasksRecord = useTaskStore((s) => s.tasks);
  const microRecord = useTaskStore((s) => s.microtopics);
  const today = useCalendarDate();

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
        const label = `${t.assigned_date} · ${taskLabel(t, microRecord)}`.toLowerCase();
        return label.includes(q) || taskLabel(t, microRecord).toLowerCase().includes(q);
      })
      .slice(0, 8);
  }, [taskList, taskInput, microRecord]);

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

  const ringProgress =
    focusTarget != null && focusTarget > 0
      ? Math.min(100, (elapsed / focusTarget) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <EngineHero
        eyebrow="Focus"
        title="Timer"
        description="Pomodoro-style focus blocks and custom durations — linked to real tasks so every minute logs to your execution trail."
      />

      <EngineCard title="Link to task">
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="relative w-full sm:max-w-md">
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
              placeholder="Type a task or pick from your list…"
              autoComplete="off"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-3 text-sm text-white placeholder:text-zinc-600"
              aria-autocomplete="list"
              aria-expanded={suggestOpen && filteredSuggestions.length > 0}
            />
            {suggestOpen && filteredSuggestions.length > 0 ? (
              <ul
                role="listbox"
                className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-slate-600 bg-slate-900 py-1 shadow-lg"
              >
                {filteredSuggestions.map((t) => {
                  const line = `${t.assigned_date} · ${taskLabel(t, microRecord)}`;
                  return (
                    <li key={t.id} role="option">
                      <button
                        type="button"
                        className="w-full px-3 py-2.5 text-left text-sm text-zinc-200 hover:bg-slate-800"
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
            <p className="mt-1.5 text-[11px] text-zinc-600">
              New name creates a task for today — then the timer links to it.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:pt-0">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                disabled={!taskInput.trim() || creatingTask}
                onClick={async () => {
                  setCustomSec(p.work);
                  setFocusTarget(p.work);
                  const task = await resolveTaskForTimer();
                  if (task) void startLinked(task);
                }}
                className="rounded-xl border border-slate-600 bg-slate-900/80 px-3 py-2 text-xs font-semibold text-zinc-200 disabled:opacity-40"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <label className="mt-4 block text-xs text-zinc-500">
          Custom target (minutes)
          <input
            type="number"
            min={1}
            max={240}
            value={Math.round(customSec / 60)}
            onChange={(e) => {
              const m = Number(e.target.value);
              if (!Number.isFinite(m) || m <= 0) return;
              setCustomSec(m * 60);
            }}
            className="mt-1 w-full max-w-[8rem] rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-white"
          />
        </label>
        <button
          type="button"
          disabled={!taskInput.trim() || creatingTask}
          onClick={async () => {
            const task = await resolveTaskForTimer();
            if (!task) return;
            setFocusTarget(customSec);
            void startLinked(task);
          }}
          className="mt-3 inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-40"
        >
          <Play className="h-4 w-4" />
          {creatingTask ? "Creating…" : "Start linked timer"}
        </button>
      </EngineCard>

      <EngineCard title="Active session">
        {activeId ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">
              Task ID: <span className="font-mono text-xs text-zinc-500">{activeId}</span>
            </p>
            <p className="text-5xl font-bold tabular-nums text-emerald-300">
              {formatElapsedSeconds(elapsed)}
            </p>
            {focusTarget != null && (
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
                  style={{ width: `${ringProgress}%` }}
                />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {isRunning && (
                <button
                  type="button"
                  onClick={() => {
                    useActiveTimerStore.getState().pause();
                    setTick((n) => n + 1);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
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
                className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-2.5 text-sm font-semibold text-rose-100"
              >
                <Square className="h-4 w-4" />
                End &amp; log session
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            No active timer — pick a task and start a block. Time accrues to{" "}
            <span className="text-zinc-400">time spent</span> on the task.
          </p>
        )}
      </EngineCard>
    </div>
  );
}
