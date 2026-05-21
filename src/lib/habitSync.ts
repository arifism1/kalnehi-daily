"use client";

import { applyHabitOutboxOp, fetchHabitsData } from "@/actions/habits";
import {
  bumpHabitOutboxFail,
  deleteHabitOutbox,
  getAllHabitOutbox,
  getHabitBundleCached,
  mergeHabitBundleFromServer,
  saveHabitBundleCached,
} from "@/lib/habitLocal";

let flushing = false;
const MAX_FAIL_BEFORE_DROP = 12;

export async function flushHabitOutbox(userId: string | undefined): Promise<void> {
  if (!userId || typeof window === "undefined" || flushing) return;
  flushing = true;
  try {
    const pending = await getAllHabitOutbox();
    for (const row of pending) {
      if (row.userId !== userId) continue;
      const fails = row.failCount ?? 0;
      if (fails >= MAX_FAIL_BEFORE_DROP) {
        // react-doctor-disable-next-line react-doctor/async-await-in-loop -- outbox must be processed sequentially to preserve mutation order
        await deleteHabitOutbox(row.id);
        continue;
      }
      // react-doctor-disable-next-line react-doctor/async-await-in-loop -- outbox must be processed sequentially to preserve mutation order
      const res = await applyHabitOutboxOp(row.op);
      // react-doctor-disable-next-line react-doctor/async-await-in-loop -- outbox must be processed sequentially to preserve mutation order
      if (res.ok) await deleteHabitOutbox(row.id);
      // react-doctor-disable-next-line react-doctor/async-await-in-loop -- outbox must be processed sequentially to preserve mutation order
      else await bumpHabitOutboxFail(row.id);
    }
    const stillPending = (await getAllHabitOutbox()).some(
      (p) => p.userId === userId,
    );
    if (stillPending) return;

    const fresh = await fetchHabitsData();
    if (fresh.ok) {
      const cached = await getHabitBundleCached(userId);
      await saveHabitBundleCached(
        mergeHabitBundleFromServer(cached, {
          habits: fresh.habits,
          logs: fresh.logs,
        }),
      );
    }
  } catch {
    /* ignore */
  } finally {
    flushing = false;
  }
}
