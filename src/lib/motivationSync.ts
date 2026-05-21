"use client";

import {
  applyMotivationOutboxOp,
  fetchMotivationData,
} from "@/actions/motivation";
import {
  bumpMotivationOutboxFail,
  deleteMotivationOutbox,
  getAllMotivationOutbox,
  getMotivationBundleCached,
  mergeBundleFromServer,
  saveMotivationBundleCached,
} from "@/lib/motivationLocal";

let flushing = false;

const MAX_FAIL_BEFORE_DROP = 12;

/**
 * Push pending motivation mutations using the same browser session as the app.
 */
export async function flushMotivationOutbox(userId: string | undefined): Promise<void> {
  if (!userId || typeof window === "undefined" || flushing) return;
  flushing = true;
  try {
    const pending = await getAllMotivationOutbox();
    for (const row of pending) {
      if (row.userId !== userId) continue;
      const fails = row.failCount ?? 0;
      if (fails >= MAX_FAIL_BEFORE_DROP) {
        // react-doctor-disable-next-line react-doctor/async-await-in-loop -- outbox must be processed sequentially to preserve mutation order
        await deleteMotivationOutbox(row.id);
        continue;
      }
      // react-doctor-disable-next-line react-doctor/async-await-in-loop -- outbox must be processed sequentially to preserve mutation order
      const res = await applyMotivationOutboxOp(row.op);
      if (res.ok) {
        // react-doctor-disable-next-line react-doctor/async-await-in-loop -- outbox must be processed sequentially to preserve mutation order
        await deleteMotivationOutbox(row.id);
      } else {
        // react-doctor-disable-next-line react-doctor/async-await-in-loop -- outbox must be processed sequentially to preserve mutation order
        await bumpMotivationOutboxFail(row.id);
      }
    }
    const stillPending = (await getAllMotivationOutbox()).some(
      (p) => p.userId === userId,
    );
    if (stillPending) return;

    const fresh = await fetchMotivationData();
    if (fresh.ok) {
      const cached = await getMotivationBundleCached(userId);
      await saveMotivationBundleCached(
        mergeBundleFromServer(cached, {
          letters: fresh.letters,
          voices: fresh.voices,
          photos: fresh.photos,
          prefs: fresh.prefs,
        }),
      );
    }
  } catch {
    /* ignore */
  } finally {
    flushing = false;
  }
}
