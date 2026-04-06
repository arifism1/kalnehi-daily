import { create } from "zustand";

import type { Tables } from "@/types/supabase";

export type Microtopic = Tables<"syllabus_master">;
export type Task = Tables<"tasks">;

export type TaskRecord = Record<string, Task>;
export type MicrotopicRecord = Record<string, Microtopic>;

export type MergeServerTasksOptions = {
  /** Server rows for these ids are ignored (optimistic delete still in outbox). */
  pendingDeleteIds?: ReadonlySet<string>;
  /** Keep current Zustand row — pending create/update not flushed yet. */
  pendingLocalMutationIds?: ReadonlySet<string>;
};

type TaskStore = {
  tasks: TaskRecord;
  microtopics: MicrotopicRecord;
  hydrated: boolean;
  setHydrated: (v: boolean) => void;
  setTasks: (tasks: Task[]) => void;
  setMicrotopics: (rows: Microtopic[]) => void;
  mergeServerTasks: (tasks: Task[], opts?: MergeServerTasksOptions) => void;
  mergeServerMicrotopics: (rows: Microtopic[]) => void;
  taskCreated: (task: Task) => void;
  taskEdited: (task: Task) => void;
  removeTask: (id: string) => void;
};

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: {},
  microtopics: {},
  hydrated: false,

  setHydrated: (v) => set({ hydrated: v }),

  setTasks: (tasks) =>
    set({ tasks: Object.fromEntries(tasks.map((t) => [t.id, t])) }),

  setMicrotopics: (rows) =>
    set({ microtopics: Object.fromEntries(rows.map((m) => [m.id, m])) }),

  mergeServerTasks: (tasks, opts) => {
    const pendingDeleteIds = opts?.pendingDeleteIds;
    const pendingLocalMutationIds = opts?.pendingLocalMutationIds;
    const next = { ...get().tasks };
    for (const t of tasks) {
      if (pendingDeleteIds?.has(t.id)) continue;
      if (pendingLocalMutationIds?.has(t.id)) continue;
      next[t.id] = t;
    }
    set({ tasks: next });
  },

  mergeServerMicrotopics: (rows) => {
    const next = { ...get().microtopics };
    for (const m of rows) next[m.id] = m;
    set({ microtopics: next });
  },

  taskCreated: (task) =>
    set((s) => ({ tasks: { ...s.tasks, [task.id]: task } })),

  taskEdited: (task) =>
    set((s) => ({ tasks: { ...s.tasks, [task.id]: task } })),

  removeTask: (id) =>
    set((s) => {
      const next = { ...s.tasks };
      delete next[id];
      return { tasks: next };
    }),
}));
