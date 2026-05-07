import { create } from "zustand";

import type { Tables, TablesUpdate } from "@/types/supabase";

export type Microtopic = Tables<"syllabus_master"> & {
  marks_2026?: number | null;
};
export type Task = Tables<"tasks">;

export type TaskRecord = Record<string, Task>;
export type MicrotopicRecord = Record<string, Microtopic>;

export type MergeServerTasksOptions = {
  /** Server rows for these ids are ignored (optimistic delete still in outbox). */
  pendingDeleteIds?: ReadonlySet<string>;
  /** Keep current Zustand row — pending create/update not flushed yet. */
  pendingLocalMutationIds?: ReadonlySet<string>;
  /**
   * When the outbox has a `task_update` for a row the server also returned, merge
   * `server row + patch` so we do not need a pre-filled local copy (e.g. before IDB
   * hydration completes).
   */
  pendingUpdatePatchesByTaskId?: ReadonlyMap<
    string,
    TablesUpdate<"tasks">
  >;
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
    const patchById = opts?.pendingUpdatePatchesByTaskId;
    const next = { ...get().tasks };
    for (const t of tasks) {
      if (pendingDeleteIds?.has(t.id)) continue;
      if (pendingLocalMutationIds?.has(t.id)) {
        const patch = patchById?.get(t.id);
        if (patch) {
          next[t.id] = { ...t, ...patch } as Task;
        }
        continue;
      }
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
