"use client";

import {
  applyOptimisticTaskDelete,
  undoRestoreTaskDelete,
} from "@/lib/taskMutations";
import { useUndoStore } from "@/store/useUndoStore";

export async function deleteTaskWithUndo(
  taskId: string,
  userId: string | undefined,
): Promise<void> {
  const res = await applyOptimisticTaskDelete(taskId, userId);
  if (!res.ok) return;
  const { snapshot, outboxId } = res;
  useUndoStore.getState().offerUndo({
    message: "Task deleted",
    autoDismissMs: 2000,
    runUndo: async () => {
      await undoRestoreTaskDelete(snapshot, outboxId, userId);
    },
  });
}
