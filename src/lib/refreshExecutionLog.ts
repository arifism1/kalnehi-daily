"use client";

import { fetchTaskSessionsForLog } from "@/actions/taskSessions";
import { mergeExecutionSessions } from "@/lib/taskIdb";

const DEFAULT_SINCE_YEARS = 4;

/**
 * Pull remote task_sessions into IndexedDB for offline execution log.
 */
export async function refreshExecutionLogFromServer(): Promise<void> {
  const since = new Date();
  since.setFullYear(since.getFullYear() - DEFAULT_SINCE_YEARS);
  const sinceIso = since.toISOString();

  const res = await fetchTaskSessionsForLog(sinceIso, 8000);
  if (!res.ok) return;

  await mergeExecutionSessions(
    res.rows.map((r) => ({
      id: r.id,
      task_id: r.task_id,
      start_time: r.start_time,
      end_time: r.end_time,
      duration_seconds: r.duration_seconds,
      created_at: r.created_at,
    })),
  );
}
