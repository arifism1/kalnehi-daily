import { create } from "zustand";

type ActiveTimerState = {
  taskId: string | null;
  baseSeconds: number;
  resumeAt: number | null;
  visibilityPaused: boolean;
  /** Wall-clock ISO when the current focus session began (for task_sessions). */
  wallSessionStartIso: string | null;
  /** Cumulative task seconds when this focus session began (study delta = elapsed − this). */
  sessionBaseSeconds: number;
  start: (taskId: string, existingSeconds: number) => void;
  pause: () => void;
  resume: () => void;
  pauseFromVisibility: () => void;
  resumeFromVisibility: () => void;
  stop: () => void;
  getElapsed: () => number;
};

export const useActiveTimerStore = create<ActiveTimerState>((set, get) => ({
  taskId: null,
  baseSeconds: 0,
  resumeAt: null,
  visibilityPaused: false,
  wallSessionStartIso: null,
  sessionBaseSeconds: 0,

  start: (taskId, existingSeconds) => {
    set((state) => {
      const base = Math.max(0, existingSeconds);
      const sameSession =
        state.taskId === taskId && state.wallSessionStartIso != null;
      return {
        taskId,
        baseSeconds: base,
        resumeAt: Date.now(),
        visibilityPaused: false,
        wallSessionStartIso: sameSession
          ? state.wallSessionStartIso
          : new Date().toISOString(),
        sessionBaseSeconds: sameSession ? state.sessionBaseSeconds : base,
      };
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

  pauseFromVisibility: () => {
    const { resumeAt } = get();
    if (resumeAt) {
      get().pause();
      set({ visibilityPaused: true });
    }
  },

  resumeFromVisibility: () => {
    const { taskId, resumeAt, visibilityPaused } = get();
    if (visibilityPaused && taskId && resumeAt === null) {
      set({ resumeAt: Date.now(), visibilityPaused: false });
    }
  },

  stop: () =>
    set({
      taskId: null,
      baseSeconds: 0,
      resumeAt: null,
      visibilityPaused: false,
      wallSessionStartIso: null,
      sessionBaseSeconds: 0,
    }),

  getElapsed: () => {
    const { baseSeconds, resumeAt } = get();
    if (!resumeAt) return baseSeconds;
    return baseSeconds + Math.floor((Date.now() - resumeAt) / 1000);
  },
}));
