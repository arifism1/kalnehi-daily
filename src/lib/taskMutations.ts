"use client";

import type { TablesInsert, TablesUpdate } from "@/types/supabase";
import { USER_ERROR } from "@/lib/userFacingErrors";
import { dispatchTasksSync } from "@/lib/taskRefreshDispatch";
import { registerOutboxBackgroundSync } from "@/lib/pwaBackgroundSync";
import { flushOutbox } from "@/lib/sync";
import {
  addOutboxMutation,
  getOutboxCount,
  putTask,
  removeOutboxMutationIfPresent,
  removeTaskLocal,
} from "@/lib/taskIdb";
import { useSyncStore } from "@/store/useSyncStore";
import type { Task } from "@/store/useTaskStore";
import { useTaskStore } from "@/store/useTaskStore";

function mergeTask(taskId: string, patch: TablesUpdate<"tasks">): Task | null {
  const prev = useTaskStore.getState().tasks[taskId];
  if (!prev) return null;
  return {
    ...prev,
    ...patch,
    updated_at: new Date().toISOString(),
  } as Task;
}

async function enqueueAndFlush(
  mutation: Parameters<typeof addOutboxMutation>[0],
  userId: string | undefined,
): Promise<string> {
  const outboxId = await addOutboxMutation(mutation);
  const n = await getOutboxCount();
  useSyncStore.getState().setPendingCount(n);
  registerOutboxBackgroundSync().catch(() => {});

  if (typeof navigator !== "undefined" && navigator.onLine && userId) {
    flushOutbox(userId).catch(() => {});
  }
  return outboxId;
}

function taskToInsertWithoutUserId(t: Task): Omit<TablesInsert<"tasks">, "user_id"> {
  return {
    id: t.id,
    assigned_date: t.assigned_date,
    status: t.status,
    microtopic_id: t.microtopic_id,
    name: t.name,
    start_time: t.start_time,
    end_time: t.end_time,
    estimated_minutes: t.estimated_minutes ?? t.estimated_time_minutes ?? null,
    estimated_time_minutes: t.estimated_time_minutes ?? t.estimated_minutes ?? null,
    marks_value: t.marks_value,
    marks_weight: t.marks_weight,
    time_spent_seconds: t.time_spent_seconds,
    created_at: t.created_at,
    updated_at: t.updated_at,
  };
}

/**
 * Restore a task after delete-undo: cancel pending delete if still queued, else re-create on server.
 */
export async function undoRestoreTaskDelete(
  snapshot: Task,
  deleteOutboxId: string,
  userId: string | undefined,
): Promise<void> {
  const hadPending = await removeOutboxMutationIfPresent(deleteOutboxId);
  useTaskStore.getState().taskCreated(snapshot);
  await putTask(snapshot);
  if (!hadPending) {
    const insert = taskToInsertWithoutUserId(snapshot);
    await enqueueAndFlush(
      { op: "task_create", taskId: snapshot.id, insert },
      userId,
    );
  } else {
    const n = await getOutboxCount();
    useSyncStore.getState().setPendingCount(n);
  }
  dispatchTasksSync();
  if (userId) flushOutbox(userId).catch(() => {});
}

/**
 * Restore task row after an optimistic update (e.g. complete / uncheck).
 */
export async function undoRestoreTaskUpdate(
  previousTask: Task,
  updateOutboxId: string,
  userId: string | undefined,
): Promise<void> {
  useTaskStore.getState().taskEdited(previousTask);
  await putTask(previousTask);
  const hadPending = await removeOutboxMutationIfPresent(updateOutboxId);
  const n = await getOutboxCount();
  useSyncStore.getState().setPendingCount(n);
  if (hadPending) {
    dispatchTasksSync();
    if (userId) flushOutbox(userId).catch(() => {});
    return;
  }
  await applyOptimisticTaskUpdate(
    previousTask.id,
    {
      status: previousTask.status,
      time_spent_seconds: previousTask.time_spent_seconds ?? null,
    },
    userId,
  );
}

/**
 * Optimistic task update: Zustand + IndexedDB first, then outbox for Supabase sync.
 */
export async function applyOptimisticTaskUpdate(
  taskId: string,
  patch: TablesUpdate<"tasks">,
  userId: string | undefined,
): Promise<
  { ok: true; outboxId: string } | { ok: false; error: string }
> {
  const merged = mergeTask(taskId, patch);
  if (!merged) return { ok: false, error: USER_ERROR.taskMissing };

  useTaskStore.getState().taskEdited(merged);
  await putTask(merged);
  const outboxId = await enqueueAndFlush(
    { op: "task_update", taskId, patch },
    userId,
  );
  dispatchTasksSync();
  return { ok: true, outboxId };
}

export async function applyOptimisticTaskDelete(
  taskId: string,
  userId: string | undefined,
): Promise<
  | { ok: true; outboxId: string; snapshot: Task }
  | { ok: false; error: string }
> {
  const snapshot = useTaskStore.getState().tasks[taskId];
  if (!snapshot) return { ok: false, error: USER_ERROR.taskMissing };

  useTaskStore.getState().removeTask(taskId);
  await removeTaskLocal(taskId);
  const outboxId = await enqueueAndFlush(
    { op: "task_delete", taskId },
    userId,
  );
  dispatchTasksSync();
  return { ok: true, outboxId, snapshot };
}

/**
 * Create task offline-first: optional client `id` for stable sync.
 */
export async function applyOptimisticTaskCreate(
  row: Omit<TablesInsert<"tasks">, "user_id" | "id"> & { id?: string },
  userId: string,
  fullTask: Task,
): Promise<{ ok: true } | { ok: false; error: string }> {
  useTaskStore.getState().taskCreated(fullTask);
  await putTask(fullTask);
  const insert: Omit<TablesInsert<"tasks">, "user_id"> = {
    ...row,
    id: fullTask.id,
  };
  await enqueueAndFlush(
    { op: "task_create", taskId: fullTask.id, insert },
    userId,
  );
  dispatchTasksSync();
  return { ok: true };
}
