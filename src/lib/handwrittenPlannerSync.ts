"use client";

import {
  handwrittenPlannerSnapshotKey,
  putHandwrittenPlannerSnapshot,
  type HandwrittenPlannerSnapshotRow,
} from "@/lib/taskIdb";


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

