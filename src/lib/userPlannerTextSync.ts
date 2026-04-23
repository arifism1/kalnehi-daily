"use client";

import {
  applyUserPlannerTextOutboxOp,
  fetchUserPlannerTextData,
} from "@/actions/userPlannerText";
import {
  bumpUserPlannerTextOutboxFail,
  createEmptyUserPlannerTextBundle,
  deleteUserPlannerTextOutbox,
  getAllUserPlannerTextOutbox,
  getUserPlannerTextBundleCached,
  saveUserPlannerTextBundleCached,
} from "@/lib/userPlannerTextLocal";
import { mergeUserPlannerTextFromServer } from "@/lib/userPlannerTextMerge";

let flushing = false;
const MAX_FAIL_BEFORE_DROP = 12;

/** Batches bursts of planner-text edits into one flush pass. */
let flushDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let flushDebounceUserId: string | undefined;
const PLANNER_TEXT_FLUSH_DEBOUNCE_MS = 55;

export function scheduleUserPlannerTextFlush(
  userId: string | undefined,
): void {
  if (!userId || typeof window === "undefined") return;
  flushDebounceUserId = userId;
  if (flushDebounceTimer) clearTimeout(flushDebounceTimer);
  flushDebounceTimer = setTimeout(() => {
    flushDebounceTimer = null;
    const uid = flushDebounceUserId;
    void flushUserPlannerTextOutbox(uid);
  }, PLANNER_TEXT_FLUSH_DEBOUNCE_MS);
}

/** Clears debounce without flushing; pair with immediate flush (e.g. tab hide). */
export function cancelPendingUserPlannerTextDebounce(): void {
  if (flushDebounceTimer) {
    clearTimeout(flushDebounceTimer);
    flushDebounceTimer = null;
  }
}

export async function flushUserPlannerTextOutbox(
  userId: string | undefined,
): Promise<void> {
  if (!userId || typeof window === "undefined" || flushing) return;
  flushing = true;
  try {
    const pending = await getAllUserPlannerTextOutbox();
    for (const row of pending) {
      if (row.userId !== userId) continue;
      const fails = row.failCount ?? 0;
      if (fails >= MAX_FAIL_BEFORE_DROP) {
        await deleteUserPlannerTextOutbox(row.id);
        continue;
      }
      const res = await applyUserPlannerTextOutboxOp(row.op);
      if (res.ok) await deleteUserPlannerTextOutbox(row.id);
      else await bumpUserPlannerTextOutboxFail(row.id);
    }
    const stillPending = (await getAllUserPlannerTextOutbox()).some(
      (p) => p.userId === userId,
    );
    if (stillPending) return;

    const fresh = await fetchUserPlannerTextData();
    if (fresh.ok) {
      const cached = await getUserPlannerTextBundleCached(userId);
      const base = cached ?? createEmptyUserPlannerTextBundle(userId);
      await saveUserPlannerTextBundleCached(
        mergeUserPlannerTextFromServer(base, fresh),
      );
    }
  } catch {
    /* ignore */
  } finally {
    flushing = false;
  }
}
