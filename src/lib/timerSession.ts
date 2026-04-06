"use client";

import { applyOptimisticTaskUpdate } from "@/lib/taskMutations";
import { applyOptimisticTaskSessionCreate } from "@/lib/taskSessionMutations";
import { useActiveTimerStore } from "@/store/useActiveTimerStore";
import { useTaskStore } from "@/store/useTaskStore";

const MIN_SESSION_LOG_SECONDS = 1;

/**
 * Stops the active timer for `taskId`, logs a `task_sessions` row when study
 * time increased this session, and persists cumulative `time_spent_seconds`.
 */
export async function finalizeActiveTimerForTask(
  userId: string | undefined,
  taskId: string,
): Promise<{ totalSeconds: number; loggedSession: boolean }> {
  const st = useActiveTimerStore.getState();
  if (st.taskId !== taskId) {
    const t = useTaskStore.getState().tasks[taskId];
    return {
      totalSeconds: t?.time_spent_seconds ?? 0,
      loggedSession: false,
    };
  }

  const totalElapsed = st.getElapsed();
  const wallStart = st.wallSessionStartIso;
  const sessionBase = st.sessionBaseSeconds;
  const duration = Math.max(0, totalElapsed - sessionBase);

  st.stop();

  let loggedSession = false;
  if (
    userId &&
    duration >= MIN_SESSION_LOG_SECONDS &&
    wallStart != null &&
    wallStart.length > 0
  ) {
    const endIso = new Date().toISOString();
    const id = crypto.randomUUID();
    await applyOptimisticTaskSessionCreate(
      {
        id,
        task_id: taskId,
        start_time: wallStart,
        end_time: endIso,
        duration_seconds: duration,
      },
      userId,
    );
    loggedSession = true;
  }

  await applyOptimisticTaskUpdate(
    taskId,
    { time_spent_seconds: totalElapsed },
    userId,
  );

  return { totalSeconds: totalElapsed, loggedSession };
}
