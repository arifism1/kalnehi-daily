"use client";

import clsx from "clsx";
import { Check, Pause, Play, Undo2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  updateDailyTask,
  updateDailyTaskWorkedTime,
  type DailyTaskView,
} from "@/actions/dailyPlan";
import { CircularProgressRing } from "@/components/ui/CircularProgressRing";
import { TASK_STATUS } from "@/components/task/TaskCard";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useRefreshTasksOnHomeFocus } from "@/hooks/useRefreshTasksOnHomeFocus";
import { toCalendarDateKey } from "@/lib/calendarDateKey";
import { fetchDailyPlanTasksForClient } from "@/lib/fetchDailyPlanTasksForClient";
import { quickCreatePlannedTask } from "@/lib/quickTaskCreate";
import { normalizeSyllabusMasterId } from "@/lib/syllabusIds";
import { trackMetaTaskCompleted, trackMetaTimerStarted } from "@/lib/analytics";
import { trackActivity } from "@/lib/activity";
import { applyOptimisticTaskUpdate } from "@/lib/taskMutations";
import { formatElapsedSeconds } from "@/lib/taskTime";
import {
  abandonActiveTimerWithoutSaving,
  finalizeActiveTimerForTask,
} from "@/lib/timerSession";
import {
  VOICE_FOCUS_HINT_KEY,
  type VoiceFocusHintV1,
} from "@/lib/voiceBossModeHints";
import { useActiveTimerStore } from "@/store/useActiveTimerStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useDailyTaskTimerStore } from "@/store/useDailyTaskTimerStore";
import { useTaskStore } from "@/store/useTaskStore";
import type { Task } from "@/store/useTaskStore";

import { EngineCard, EngineHero } from "./EngineHero";
import { TimerIllustration } from "@/components/illustrations/TimerIllustration";

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

type TaskLinkPick =
  | { kind: "legacy"; id: string; task: Task }
  | { kind: "daily"; id: string; row: DailyTaskView };

type LegacySessionOutcome = "done" | "undone" | "auto";

function dailyPlanPickerLine(row: DailyTaskView): string {
  return `Daily plan · ${row.title.trim() || "Untitled"}`;
}

function notifyDailyPlanPage(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("kalnehi-daily-plan-synced"));
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
  const [pickedDailyTaskId, setPickedDailyTaskId] = useState<string | null>(
    null,
  );
  const [dailyPlanTasks, setDailyPlanTasks] = useState<DailyTaskView[]>([]);
  const todayRef = useRef(today);
  const dailyPlanTasksRef = useRef<DailyTaskView[]>([]);
  const microRecordRef = useRef(microRecord);
  todayRef.current = today;
  dailyPlanTasksRef.current = dailyPlanTasks;
  microRecordRef.current = microRecord;

  const [suggestOpen, setSuggestOpen] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  /**
   * Tracks when the timer auto-created a new task (free-form text → no existing match).
   * Those tasks are auto-completed when the timer session ends so they don't pile up in
   * Missed Tasks — the user studied the topic, the task is done.
   */
  const timerCreatedTaskIdRef = useRef<string | null>(null);
  /** Per active timer session — used when ending/logging so we can complete or revert pending tasks correctly. */
  const activeSessionMetaRef = useRef<{
    taskId: string;
    focusTargetSec: number;
    startedAsPending: boolean;
    isTimerCreated: boolean;
    initialStatus: Task["status"];
  } | null>(null);
  const [customSec, setCustomSec] = useState(25 * 60);
  const [focusTarget, setFocusTarget] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  /** Open tasks (any day) — used when resolving free-typed names to an existing task. */
  const allOpenTasks = useMemo(() => {
    return Object.values(tasksRecord)
      .filter((t) => t.status !== "completed")
      .sort((a, b) => a.assigned_date.localeCompare(b.assigned_date));
  }, [tasksRecord]);

  /** Today's legacy `tasks` rows for the link picker (includes completed so users can log more time). */
  const todaysPickList = useMemo(() => {
    const rank = (t: Task) =>
      t.status === "completed" ? 2 : t.status === "in_progress" ? 1 : 0;
    return Object.values(tasksRecord)
      .filter((t) => toCalendarDateKey(t.assigned_date) === today)
      .sort((a, b) => {
        const dr = rank(a) - rank(b);
        if (dr !== 0) return dr;
        return taskLabel(a, microRecord).localeCompare(taskLabel(b, microRecord));
      });
  }, [tasksRecord, today, microRecord]);

  /** Today's rows from Daily Plan (`daily_tasks`) — same list as /daily-plan for `planDate === today`. */
  const dailyPickList = useMemo(() => {
    return dailyPlanTasks.filter(
      (t) =>
        t.plan_date === today &&
        t.status !== "done" &&
        t.status !== "skipped",
    );
  }, [dailyPlanTasks, today]);

  const combinedPicks = useMemo((): TaskLinkPick[] => {
    const daily: TaskLinkPick[] = dailyPickList.map((row) => ({
      kind: "daily",
      id: row.id,
      row,
    }));
    const legacy: TaskLinkPick[] = todaysPickList.map((task) => ({
      kind: "legacy",
      id: task.id,
      task,
    }));
    return [...daily, ...legacy];
  }, [dailyPickList, todaysPickList]);

  const filteredCombinedPicks = useMemo(() => {
    const q = taskInput.trim().toLowerCase();
    if (!q) return combinedPicks.slice(0, 25);
    return combinedPicks
      .filter((pick) => {
        if (pick.kind === "daily") {
          const title = (pick.row.title || "").toLowerCase();
          const line = dailyPlanPickerLine(pick.row).toLowerCase();
          return line.includes(q) || title.includes(q);
        }
        const t = pick.task;
        const label =
          `${t.assigned_date} · ${taskLabel(t, microRecord)}`.toLowerCase();
        return (
          label.includes(q) ||
          taskLabel(t, microRecord).toLowerCase().includes(q)
        );
      })
      .slice(0, 25);
  }, [combinedPicks, taskInput, microRecord]);

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

  useEffect(() => {
    if (!pickedDailyTaskId) return;
    const row = dailyPlanTasks.find((t) => t.id === pickedDailyTaskId);
    if (!row) {
      setPickedDailyTaskId(null);
      return;
    }
    const line = dailyPlanPickerLine(row);
    if (line.toLowerCase() !== taskInput.trim().toLowerCase()) {
      setPickedDailyTaskId(null);
    }
  }, [taskInput, pickedDailyTaskId, dailyPlanTasks]);

  const refreshDailyPlanTasks = useCallback(async () => {
    if (!userId) {
      setDailyPlanTasks([]);
      return;
    }
    const r = await fetchDailyPlanTasksForClient(today);
    if (r.ok) setDailyPlanTasks(r.tasks);
  }, [userId, today]);

  useEffect(() => {
    void refreshDailyPlanTasks();
  }, [refreshDailyPlanTasks]);

  useEffect(() => {
    if (!userId) return;
    const onVis = () => {
      if (document.visibilityState === "visible")
        void refreshDailyPlanTasks();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [userId, refreshDailyPlanTasks]);

  const activeId = useActiveTimerStore((s) => s.taskId);
  const isRunning = useActiveTimerStore((s) => s.resumeAt != null);
  const pausedHere = Boolean(activeId && !isRunning);

  const dailyActiveId = useDailyTaskTimerStore((s) => s.taskId);
  const dailyResumeAt = useDailyTaskTimerStore((s) => s.resumeAt);
  const dailyRunning = Boolean(dailyActiveId && dailyResumeAt != null);
  const dailyPausedHere = Boolean(dailyActiveId && !dailyResumeAt);

  const prevActiveIdRef = useRef<string | null>(null);
  const prevDailyActiveIdRef = useRef<string | null>(null);

  useEffect(() => {
    const prevL = prevActiveIdRef.current;
    const prevD = prevDailyActiveIdRef.current;
    if ((prevL || prevD) && !activeId && !dailyActiveId) {
      setFocusTarget(null);
    }
    prevActiveIdRef.current = activeId;
    prevDailyActiveIdRef.current = dailyActiveId;
  }, [activeId, dailyActiveId]);

  useEffect(() => {
    const legacyTick = activeId && isRunning;
    const dailyTick = dailyActiveId && dailyRunning;
    if (!legacyTick && !dailyTick) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [activeId, isRunning, dailyActiveId, dailyRunning]);

  const elapsed = useMemo(() => {
    void tick;
    const d = useDailyTaskTimerStore.getState();
    if (d.taskId) return d.getElapsed();
    const st = useActiveTimerStore.getState();
    if (!st.taskId) return 0;
    return st.getElapsed();
  }, [tick, activeId, dailyActiveId]);

  const activeTask = activeId ? tasksRecord[activeId] : null;
  const activeTaskTitle = activeTask
    ? taskLabel(activeTask, microRecord)
    : null;
  const activeTaskLine = activeTask
    ? `${activeTask.assigned_date} · ${taskLabel(activeTask, microRecord)}`
    : null;

  const activeDailyRow = dailyActiveId
    ? dailyPlanTasks.find((t) => t.id === dailyActiveId)
    : null;
  const activeDailyTitle = activeDailyRow
    ? activeDailyRow.title.trim() || "Daily task"
    : null;
  const activeDailyLine = activeDailyRow
    ? dailyPlanPickerLine(activeDailyRow)
    : null;
  
  const remainingSec =
    focusTarget != null && focusTarget > 0
      ? Math.max(0, focusTarget - elapsed)
      : null;

  /** Today's Daily Plan rows linked to this legacy `tasks` row (syllabus id and/or same title). */
  const syncLegacyTimerTaskToDailyPlan = useCallback(
    async (legacyTaskId: string): Promise<boolean> => {
      if (!userId) return false;
      const t = useTaskStore.getState().tasks[legacyTaskId];
      if (!t) return false;
      const day = todayRef.current;
      const micro = microRecordRef.current;
      const labelKey = taskLabel(t, micro).trim().toLowerCase();
      const sid = t.microtopic_id?.trim();
      const normSid = sid ? normalizeSyllabusMasterId(sid) : null;

      const seen = new Set<string>();
      const matches: DailyTaskView[] = [];
      for (const r of dailyPlanTasksRef.current) {
        if (r.plan_date !== day || r.status === "skipped") continue;
        if (seen.has(r.id)) continue;
        let match = false;
        if (normSid && r.syllabus_master_id?.trim()) {
          match =
            normalizeSyllabusMasterId(r.syllabus_master_id) === normSid;
        }
        if (!match && labelKey.length > 0) {
          match = (r.title || "").trim().toLowerCase() === labelKey;
        }
        if (!match) continue;
        seen.add(r.id);
        matches.push(r);
      }

      if (matches.length === 0) return false;

      const planDone = t.status === TASK_STATUS.completed;
      const nextDailyStatus = planDone ? "done" : "pending";
      let any = false;
      for (const row of matches) {
        if (row.status === nextDailyStatus) continue;
        const res = await updateDailyTask(row.id, { status: nextDailyStatus });
        if (res.ok) {
          any = true;
          setDailyPlanTasks((prev) =>
            prev.map((x) =>
              x.id === row.id ? { ...x, status: nextDailyStatus } : x,
            ),
          );
        }
      }
      return any;
    },
    [userId],
  );

  /** Daily Plan timer end: explicit done/undone vs switching tasks (time only, no status flip). */
  const flushDailyTaskTimerToServer = useCallback(
    async (
      taskId: string,
      mode: "mark_done" | "mark_undone" | "save_time_only",
    ) => {
      const st = useDailyTaskTimerStore.getState();
      if (st.taskId !== taskId) return;
      const atStart = st.workMinutesAtSessionStart;
      const sec = st.getElapsed();
      st.stop();
      const add = Math.max(0, Math.round(sec / 60) - atStart);
      if (mode !== "mark_undone" && add > 0) {
        const res = await updateDailyTaskWorkedTime(taskId, add);
        if (res.ok) {
          setDailyPlanTasks((rows) =>
            rows.map((r) =>
              r.id === taskId
                ? { ...r, actual_worked_minutes: res.totalMinutes }
                : r,
            ),
          );
        }
      }
      if (mode === "mark_done") {
        const statusRes = await updateDailyTask(taskId, { status: "done" });
        if (statusRes.ok) {
          setDailyPlanTasks((rows) =>
            rows.map((r) =>
              r.id === taskId ? { ...r, status: "done" } : r,
            ),
          );
          trackMetaTaskCompleted();
          const doneTask = dailyPlanTasksRef.current.find((r) => r.id === taskId);
          trackActivity("task_completed", { feature: "daily_plan", task_id: taskId, task_title: doneTask?.title ?? taskId });
        }
      } else if (mode === "mark_undone") {
        const cur = dailyPlanTasksRef.current.find((r) => r.id === taskId);
        if (
          cur &&
          cur.status !== "skipped" &&
          cur.status === "done"
        ) {
          const statusRes = await updateDailyTask(taskId, {
            status: "pending",
          });
          if (statusRes.ok) {
            setDailyPlanTasks((rows) =>
              rows.map((r) =>
                r.id === taskId ? { ...r, status: "pending" } : r,
              ),
            );
          }
        }
      }
      notifyDailyPlanPage();
    },
    [],
  );

  const commitTimerToServer = useCallback(
    async (taskId: string, outcome: LegacySessionOutcome = "auto") => {
      if (!userId) return;
      const st = useActiveTimerStore.getState();
      const elapsed = st.taskId === taskId ? st.getElapsed() : 0;
      const meta = activeSessionMetaRef.current;

      if (outcome === "undone") {
        if (st.taskId === taskId) {
          await abandonActiveTimerWithoutSaving(userId, taskId);
        }
      } else {
        await finalizeActiveTimerForTask(userId, taskId);
      }

      const patchStatus = async (status: Task["status"]) => {
        const prev = useTaskStore.getState().tasks[taskId]?.status;
        const taskData = useTaskStore.getState().tasks[taskId];
        await applyOptimisticTaskUpdate(taskId, { status }, userId);
        if (prev !== "completed" && status === TASK_STATUS.completed) {
          trackMetaTaskCompleted();
          trackActivity("task_completed", { feature: "tasks", task_id: taskId, task_title: taskData?.name ?? taskId });
        }
      };

      if (meta?.taskId !== taskId) {
        if (timerCreatedTaskIdRef.current === taskId) {
          timerCreatedTaskIdRef.current = null;
          if (outcome === "undone") {
            await patchStatus(TASK_STATUS.pending);
          } else {
            await patchStatus(TASK_STATUS.completed);
          }
        }
        activeSessionMetaRef.current = null;
        if (await syncLegacyTimerTaskToDailyPlan(taskId)) {
          notifyDailyPlanPage();
        }
        return;
      }

      const { isTimerCreated, startedAsPending, initialStatus, focusTargetSec } =
        meta;

      if (isTimerCreated && timerCreatedTaskIdRef.current === taskId) {
        timerCreatedTaskIdRef.current = null;
        if (outcome === "undone") {
          await patchStatus(TASK_STATUS.pending);
        } else {
          await patchStatus(TASK_STATUS.completed);
        }
      } else if (startedAsPending) {
        let wantDone = false;
        if (outcome === "done") wantDone = true;
        else if (outcome === "undone") wantDone = false;
        else wantDone = focusTargetSec > 0 && elapsed >= focusTargetSec;
        await patchStatus(
          wantDone ? TASK_STATUS.completed : TASK_STATUS.pending,
        );
      } else {
        if (outcome === "done") {
          if (initialStatus !== TASK_STATUS.completed) {
            await patchStatus(TASK_STATUS.completed);
          }
        } else if (outcome === "undone") {
          if (initialStatus === TASK_STATUS.in_progress) {
            await patchStatus(TASK_STATUS.pending);
          }
        }
      }

      if (activeSessionMetaRef.current?.taskId === taskId) {
        activeSessionMetaRef.current = null;
      }
      if (await syncLegacyTimerTaskToDailyPlan(taskId)) {
        notifyDailyPlanPage();
      }
    },
    [userId, syncLegacyTimerTaskToDailyPlan],
  );

  const startLinked = async (
    task: Task,
    sessionMeta: {
      taskId: string;
      focusTargetSec: number;
      startedAsPending: boolean;
      isTimerCreated: boolean;
      initialStatus: Task["status"];
    },
  ) => {
    if (!userId) return;
    const d0 = useDailyTaskTimerStore.getState();
    if (d0.taskId) {
      await flushDailyTaskTimerToServer(d0.taskId, "save_time_only");
    }
    const st = useActiveTimerStore.getState();
    if (st.taskId && st.taskId !== task.id) {
      await commitTimerToServer(st.taskId, "auto");
    }
    activeSessionMetaRef.current = sessionMeta;
    trackActivity("timer_started", { feature: "tasks", task_id: task.id, task_title: task.name ?? task.id });
    if (task.status === TASK_STATUS.pending) {
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
    } else if (task.status === TASK_STATUS.in_progress) {
      const cur = useActiveTimerStore.getState();
      if (cur.taskId !== task.id) {
        cur.start(task.id, task.time_spent_seconds ?? 0);
        trackMetaTimerStarted();
      } else if (!cur.resumeAt) {
        cur.resume();
        trackMetaTimerStarted();
      }
    } else {
      useActiveTimerStore.getState().start(task.id, task.time_spent_seconds ?? 0);
      trackMetaTimerStarted();
    }
  };

  const startDailyLinked = async (row: DailyTaskView) => {
    if (!userId) return;
    const leg = useActiveTimerStore.getState();
    if (leg.taskId) {
      await commitTimerToServer(leg.taskId, "auto");
    }
    const dSt = useDailyTaskTimerStore.getState();
    if (dSt.taskId && dSt.taskId !== row.id) {
      await flushDailyTaskTimerToServer(dSt.taskId, "save_time_only");
    }
    useDailyTaskTimerStore
      .getState()
      .start(row.id, row.actual_worked_minutes ?? 0);
    trackMetaTimerStarted();
    trackActivity("timer_started", { feature: "daily_plan", task_id: row.id, task_title: row.title });
  };

  const finishSessionMarkDone = async () => {
    if (dailyActiveId) {
      await flushDailyTaskTimerToServer(dailyActiveId, "mark_done");
      setTick((n) => n + 1);
      return;
    }
    if (!activeId || !userId) return;
    await commitTimerToServer(activeId, "done");
    setTick((n) => n + 1);
  };

  const finishSessionMarkUndone = async () => {
    if (dailyActiveId) {
      await flushDailyTaskTimerToServer(dailyActiveId, "mark_undone");
      setTick((n) => n + 1);
      return;
    }
    if (!activeId || !userId) return;
    await commitTimerToServer(activeId, "undone");
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
    const exact = allOpenTasks.find(
      (t) => taskLabel(t, microRecord).toLowerCase() === lower,
    );
    if (exact) return exact;
    const lineMatch = allOpenTasks.find((t) => {
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
      timerCreatedTaskIdRef.current = r.id;
      return useTaskStore.getState().tasks[r.id] ?? null;
    } finally {
      setCreatingTask(false);
    }
  }, [
    userId,
    pickedTaskId,
    tasksRecord,
    taskInput,
    allOpenTasks,
    microRecord,
    today,
  ]);

  const handleStart = async () => {
    if (pickedDailyTaskId) {
      const row = dailyPlanTasks.find((t) => t.id === pickedDailyTaskId);
      if (
        !row ||
        row.plan_date !== today ||
        row.status === "done" ||
        row.status === "skipped"
      ) {
        return;
      }
      setFocusTarget(customSec);
      await startDailyLinked(row);
      return;
    }

    const task = await resolveTaskForTimer();
    if (!task) return;
    setFocusTarget(customSec);
    const isTimerCreated = timerCreatedTaskIdRef.current === task.id;
    const sessionMeta = {
      taskId: task.id,
      focusTargetSec: customSec,
      startedAsPending: !isTimerCreated && task.status === TASK_STATUS.pending,
      isTimerCreated,
      initialStatus: task.status,
    };
    void startLinked(task, sessionMeta);
  };

  const handleStartRef = useRef(handleStart);
  handleStartRef.current = handleStart;

  useEffect(() => {
    if (typeof window === "undefined" || !userId) return;
    const raw = sessionStorage.getItem(VOICE_FOCUS_HINT_KEY);
    if (!raw) return;
    let hint: VoiceFocusHintV1;
    try {
      hint = JSON.parse(raw) as VoiceFocusHintV1;
      if (hint.v !== 1) {
        sessionStorage.removeItem(VOICE_FOCUS_HINT_KEY);
        return;
      }
    } catch {
      sessionStorage.removeItem(VOICE_FOCUS_HINT_KEY);
      return;
    }
    if (hint.dailyTaskId && dailyPlanTasks.length === 0) return;

    sessionStorage.removeItem(VOICE_FOCUS_HINT_KEY);
    setCustomSec(hint.customSec);
    setSuggestOpen(true);

    if (hint.dailyTaskId) {
      const row = dailyPlanTasks.find((t) => t.id === hint.dailyTaskId);
      if (row && row.plan_date === today) {
        setPickedDailyTaskId(hint.dailyTaskId);
        setPickedTaskId(null);
        setTaskInput(dailyPlanPickerLine(row));
      }
    } else if (hint.legacyTaskId) {
      const t = tasksRecord[hint.legacyTaskId];
      if (t && toCalendarDateKey(t.assigned_date) === today) {
        setPickedTaskId(hint.legacyTaskId);
        setPickedDailyTaskId(null);
        setTaskInput(`${t.assigned_date} · ${taskLabel(t, microRecord)}`);
      }
    } else if (hint.taskHint) {
      setPickedDailyTaskId(null);
      setPickedTaskId(null);
      setTaskInput(hint.taskHint);
    }

    if (hint.autoStart) {
      window.setTimeout(() => {
        void handleStartRef.current();
      }, 120);
    }
  }, [userId, today, dailyPlanTasks, tasksRecord, microRecord]);

  const ringProgress =
    focusTarget != null && focusTarget > 0
      ? Math.min(100, (elapsed / focusTarget) * 100)
      : 0;

  const blockMinutes = Math.max(1, Math.round(customSec / 60));

  const hasAnyTodayPick = combinedPicks.length > 0;
  const showLinkTaskPicker =
    suggestOpen &&
    (filteredCombinedPicks.length > 0 ||
      (!taskInput.trim() && !hasAnyTodayPick) ||
      (!!taskInput.trim() && filteredCombinedPicks.length === 0));

  return (
    <div className="space-y-6">
      <EngineHero
        eyebrow="Focus"
        title="Timer"
        description="Pick a block length, link a task, then start — elapsed time logs to your task. Presets set duration only; press Start when ready."
        titleAccessory={
          <TimerIllustration
            showFocusLabel={false}
            className="h-10 w-auto shrink-0 opacity-90 sm:h-12"
          />
        }
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
                        ? "border-kal-accent bg-kal-accent-soft text-kal-accent shadow-sm dark:border-kal-accent/50 dark:bg-kal-accent-soft/20 dark:text-kal-accent"
                        : "border-kal-border bg-kal-card-muted text-kal-text hover:border-kal-accent/35 hover:bg-kal-accent-soft/60",
                    )}
                  >
                    <span className="tabular-nums">{p.label}</span>
                    <span className="ml-1.5 font-normal opacity-80">
                      ({p.short})
                    </span>
                  </button>
                );
              })}
              <div className="ml-0 flex items-center gap-1.5 rounded-full border border-dashed border-kal-border px-3 py-2">
                <span className="text-xs font-medium text-kal-text-secondary">
                  Custom
                </span>
                <button
                  type="button"
                  onClick={() => setCustomSec(Math.max(5 * 60, customSec - 5 * 60))}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-kal-border bg-white text-base font-semibold transition-colors hover:border-kal-accent/40 hover:bg-kal-accent-soft dark:bg-zinc-900/80"
                  style={{ color: "#BA7517" }}
                  aria-label="Decrease duration by 5 minutes"
                >
                  −
                </button>
                <span className="min-w-[40px] text-center text-sm font-semibold tabular-nums text-kal-text">
                  {blockMinutes}
                </span>
                <button
                  type="button"
                  onClick={() => setCustomSec(Math.min(120 * 60, customSec + 5 * 60))}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-kal-border bg-white text-base font-semibold transition-colors hover:border-kal-accent/40 hover:bg-kal-accent-soft dark:bg-zinc-900/80"
                  style={{ color: "#BA7517" }}
                  aria-label="Increase duration by 5 minutes"
                >
                  +
                </button>
                <span className="text-xs text-kal-text-secondary">min</span>
              </div>
            </div>
          </div>

          <div className="relative border-t border-kal-border pt-6">
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
              className="mt-3 w-full rounded-xl border border-kal-border bg-kal-input-bg px-3 py-3 text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
              aria-autocomplete="list"
              aria-expanded={showLinkTaskPicker}
            />
            {showLinkTaskPicker ? (
              <ul
                role="listbox"
                className="kal-glass-panel absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl py-1"
              >
                {!taskInput.trim() && !hasAnyTodayPick ? (
                  <li className="px-3 py-2.5 text-sm text-kal-text-secondary">
                    No tasks for today yet — add some on Daily Plan, or type a name
                    to create a syllabus-linked task for today.
                  </li>
                ) : null}
                {taskInput.trim() && filteredCombinedPicks.length === 0 ? (
                  <li className="px-3 py-2.5 text-sm text-kal-text-secondary">
                    {hasAnyTodayPick
                      ? "No tasks for today match — try another word or type a new name."
                      : "No saved tasks for today — press Enter to add one from the name you typed."}
                  </li>
                ) : null}
                {filteredCombinedPicks.map((pick) => {
                  if (pick.kind === "daily") {
                    const row = pick.row;
                    const line = dailyPlanPickerLine(row);
                    return (
                      <li key={`daily-${row.id}`} role="option">
                        <button
                          type="button"
                          className="w-full px-3 py-2.5 text-left text-sm text-kal-text hover:bg-kal-card-muted"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setPickedDailyTaskId(row.id);
                            setPickedTaskId(null);
                            setTaskInput(line);
                            setSuggestOpen(false);
                            timerCreatedTaskIdRef.current = null;
                          }}
                        >
                          {line}
                        </button>
                      </li>
                    );
                  }
                  const t = pick.task;
                  const line = `${t.assigned_date} · ${taskLabel(t, microRecord)}`;
                  const doneTag =
                    t.status === "completed" ? " · Done (add time)" : "";
                  return (
                    <li key={t.id} role="option">
                      <button
                        type="button"
                        className="w-full px-3 py-2.5 text-left text-sm text-kal-text hover:bg-kal-card-muted"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setPickedTaskId(t.id);
                          setPickedDailyTaskId(null);
                          setTaskInput(line);
                          setSuggestOpen(false);
                          timerCreatedTaskIdRef.current = null;
                        }}
                      >
                        {line}
                        {doneTag ? (
                          <span className="text-kal-muted">{doneTag}</span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            <p className="mt-1.5 text-[11px] leading-relaxed text-kal-text-secondary">
              Tap the field for today&apos;s Daily Plan tasks (top) and syllabus daily
              tasks. Daily Plan time updates worked minutes; syllabus tasks follow the
              ring (pending vs done when you end). New names create a syllabus task for
              today.
            </p>
          </div>

          {!activeId && !dailyActiveId ? (
            <div className="kal-glass-subtle flex flex-col items-stretch gap-4 rounded-2xl p-4 sm:flex-row sm:items-center">
              <CircularProgressRing
                percent={0}
                gradientId={gidPreview}
                size={112}
                strokeWidth={8}
                className="mx-auto shrink-0 sm:mx-0"
                trackClassName="text-stone-200 dark:text-stone-600"
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
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-sm transition-transform duration-200 enabled:motion-safe:active:scale-[0.99] disabled:opacity-40 motion-reduce:enabled:active:scale-100 sm:w-auto"
            style={{ backgroundColor: "#EF9F27" }}
          >
            <Play className="h-4 w-4" />
            {creatingTask ? "Creating…" : "Start linked timer"}
          </button>
        </div>
      </EngineCard>

      <EngineCard title="Active session">
        {activeId || dailyActiveId ? (
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
                    (isRunning || dailyRunning) &&
                      "motion-safe:animate-pulse",
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
                  {dailyActiveId
                    ? (activeDailyTitle ?? "Daily task")
                    : (activeTaskTitle ?? "Task")}
                </p>
                {dailyActiveId && activeDailyLine ? (
                  <p className="mt-0.5 text-xs text-kal-muted">{activeDailyLine}</p>
                ) : null}
                {!dailyActiveId && activeTaskLine ? (
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
                {dailyActiveId ? (
                  <>
                    {dailyRunning && (
                      <button
                        type="button"
                        onClick={() => {
                          useDailyTaskTimerStore.getState().pause();
                          setTick((n) => n + 1);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-kal-accent px-4 py-2.5 text-sm font-semibold text-kal-accent-foreground transition-colors hover:bg-kal-accent-hover"
                      >
                        <Pause className="h-4 w-4" />
                        Pause
                      </button>
                    )}
                    {dailyPausedHere && (
                      <button
                        type="button"
                        onClick={() => {
                          useDailyTaskTimerStore.getState().resume();
                          trackMetaTimerStarted();
                          setTick((n) => n + 1);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-kal-accent px-4 py-2.5 text-sm font-semibold text-kal-accent-foreground hover:bg-kal-accent-hover"
                      >
                        <Play className="h-4 w-4" />
                        Resume
                      </button>
                    )}
                  </>
                ) : (
                  <>
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
                          trackMetaTimerStarted();
                          setTick((n) => n + 1);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-kal-accent px-4 py-2.5 text-sm font-semibold text-kal-accent-foreground hover:bg-kal-accent-hover"
                      >
                        <Play className="h-4 w-4" />
                        Resume
                      </button>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={() => void finishSessionMarkUndone()}
                  className="inline-flex items-center gap-2 rounded-xl border border-kal-border bg-kal-card-muted px-4 py-2.5 text-sm font-semibold text-kal-text hover:bg-kal-card hover:border-kal-border-strong"
                >
                  <Undo2 className="h-4 w-4" />
                  Mark undone
                </button>
                <button
                  type="button"
                  onClick={() => void finishSessionMarkDone()}
                  className="inline-flex items-center gap-2 rounded-xl bg-kal-accent px-4 py-2.5 text-sm font-semibold text-kal-accent-foreground transition-colors hover:bg-kal-accent-hover"
                >
                  <Check className="h-4 w-4" />
                  Mark done
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-kal-text-secondary">
            No active timer — choose a block length, link a task, and press
            Start. When you stop, use{" "}
            <span className="font-medium text-kal-text">Mark done</span> if you
            finished the work, or{" "}
            <span className="font-medium text-kal-text">Mark undone</span> to log
            time without marking complete.
          </p>
        )}
      </EngineCard>
    </div>
  );
}
