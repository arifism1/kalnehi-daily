import { create } from "zustand";

type DailyTaskTimerState = {
  taskId: string | null;
  baseSeconds: number;
  resumeAt: number | null;
  /** `daily_tasks.actual_worked_minutes` at the moment Start was pressed (for delta on stop). */
  workMinutesAtSessionStart: number;
  start: (taskId: string, existingWorkedMinutes: number) => void;
  pause: () => void;
  resume: () => void;
  /** Clears state; returns elapsed seconds; caller derives minutes delta vs `workMinutesAtSessionStart`. */
  stop: () => number;
  getElapsed: () => number;
};

/**
 * Per–daily-task focus timer (Daily Plan). Independent of legacy `useActiveTimerStore` / `tasks` table.
 * Only one daily task may be active at a time; starting a new task replaces the previous.
 */
export const useDailyTaskTimerStore = create<DailyTaskTimerState>((set, get) => ({
  taskId: null,
  baseSeconds: 0,
  resumeAt: null,
  workMinutesAtSessionStart: 0,

  start: (taskId, existingWorkedMinutes) => {
    const atStart = Math.max(0, Math.round(Number(existingWorkedMinutes)));
    const prior = atStart * 60;
    set({
      taskId,
      workMinutesAtSessionStart: atStart,
      baseSeconds: prior,
      resumeAt: Date.now(),
    });
  },

  pause: () => {
    const { taskId, resumeAt, baseSeconds } = get();
    if (!taskId || !resumeAt) return;
    set({
      baseSeconds: baseSeconds + Math.floor((Date.now() - resumeAt) / 1000),
      resumeAt: null,
    });
  },

  resume: () => {
    const { taskId, resumeAt } = get();
    if (!taskId || resumeAt !== null) return;
    set({ resumeAt: Date.now() });
  },

  stop: () => {
    const { baseSeconds, resumeAt, taskId } = get();
    let elapsed = baseSeconds;
    if (taskId && resumeAt) {
      elapsed = baseSeconds + Math.floor((Date.now() - resumeAt) / 1000);
    }
    set({
      taskId: null,
      baseSeconds: 0,
      resumeAt: null,
      workMinutesAtSessionStart: 0,
    });
    return elapsed;
  },

  getElapsed: () => {
    const { baseSeconds, resumeAt } = get();
    if (!resumeAt) return baseSeconds;
    return baseSeconds + Math.floor((Date.now() - resumeAt) / 1000);
  },
}));
