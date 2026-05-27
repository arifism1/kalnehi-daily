"use client";

import type { TablesInsert } from "@/types/supabase";
import { registerOutboxBackgroundSync } from "@/lib/pwaBackgroundSync";
import { scheduleOutboxFlush } from "@/lib/sync";
import {
  addOutboxMutation,
  getOutboxCount,
  putExecutionSession,
  type ExecutionSessionRow,
} from "@/lib/taskIdb";
import { useSyncStore } from "@/store/useSyncStore";

function dispatchExecutionLogChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("kalnehi-execution-log-changed"));
}

export async function applyOptimisticTaskSessionCreate(
  row: TablesInsert<"task_sessions"> & { id: string },
  userId: string | undefined,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const now = new Date().toISOString();
  const local: ExecutionSessionRow = {
    id: row.id,
    task_id: row.task_id,
    start_time: row.start_time ?? now,
    end_time: row.end_time ?? null,
    duration_seconds: row.duration_seconds ?? null,
    created_at: row.created_at ?? now,
    organization_id: row.organization_id ?? null,
  };

  await putExecutionSession(local);
  await addOutboxMutation({
    op: "task_session_create",
    taskId: row.task_id,
    sessionInsert: {
      id: row.id,
      task_id: row.task_id,
      start_time: row.start_time,
      end_time: row.end_time ?? null,
      duration_seconds: row.duration_seconds ?? null,
    },
  });

  const n = await getOutboxCount();
  useSyncStore.getState().setPendingCount(n);
  registerOutboxBackgroundSync().catch(() => {});
  if (typeof navigator !== "undefined" && userId) {
    scheduleOutboxFlush(userId);
  }

  dispatchExecutionLogChanged();
  return { ok: true };
}
