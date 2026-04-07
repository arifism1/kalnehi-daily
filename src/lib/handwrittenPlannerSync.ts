"use client";

import { registerOutboxBackgroundSync } from "@/lib/pwaBackgroundSync";
import {
  addOutboxMutation,
  getOutboxCount,
  handwrittenPlannerSnapshotKey,
  putHandwrittenPlannerSnapshot,
  removePendingHandwrittenReplacementsForDate,
  type HandwrittenPlannerReplacePayload,
  type HandwrittenPlannerSnapshotRow,
} from "@/lib/taskIdb";
import { useSyncStore } from "@/store/useSyncStore";

const hwReplaceChains = new Map<string, Promise<unknown>>();

function runHandwrittenReplaceSerialized(
  logDate: string,
  fn: () => Promise<void>,
): Promise<void> {
  const prev = hwReplaceChains.get(logDate) ?? Promise.resolve();
  const next = prev.then(fn, () => {});
  hwReplaceChains.set(logDate, next);
  return next.finally(() => {
    if (hwReplaceChains.get(logDate) === next) {
      hwReplaceChains.delete(logDate);
    }
  });
}

export async function persistHandwrittenSnapshotLocal(
  userId: string,
  logDate: string,
  sourceText: string,
  rows: HandwrittenPlannerSnapshotRow[],
): Promise<void> {
  await putHandwrittenPlannerSnapshot({
    key: handwrittenPlannerSnapshotKey(userId, logDate),
    userId,
    logDate,
    sourceText,
    rows,
    updatedAt: Date.now(),
  });
}

function buildReplacePayload(
  logDate: string,
  sourceText: string,
  tasks: HandwrittenPlannerReplacePayload["tasks"],
): HandwrittenPlannerReplacePayload {
  return {
    log_date: logDate,
    source_text: sourceText,
    tasks: tasks.map((t) => ({
      activityName: t.activityName,
      start_time: t.start_time?.trim() || null,
      end_time: t.end_time?.trim() || null,
      duration: t.duration?.trim() || null,
    })),
  };
}

/**
 * Queues a full replace for `handwritten_planner_entries` for one date.
 * Coalesces with any pending replace for the same date. Does not touch tasks or voice tables.
 */
export async function pushHandwrittenPlannerReplaceToOutbox(opts: {
  userId: string;
  logDate: string;
  sourceText: string;
  tasks: HandwrittenPlannerReplacePayload["tasks"];
}): Promise<void> {
  const { userId, logDate, sourceText, tasks } = opts;
  await runHandwrittenReplaceSerialized(logDate, async () => {
    await removePendingHandwrittenReplacementsForDate(logDate);
    await addOutboxMutation({
      op: "handwritten_planner_replace",
      taskId: `hw-replace|${logDate}`,
      handwrittenReplace: buildReplacePayload(logDate, sourceText, tasks),
    });
    const n = await getOutboxCount();
    useSyncStore.getState().setPendingCount(n);
    registerOutboxBackgroundSync().catch(() => {});
    void import("@/lib/sync").then(({ scheduleOutboxFlush }) => {
      if (typeof navigator !== "undefined" && navigator.onLine) {
        scheduleOutboxFlush(userId);
      }
    });
  });
}
