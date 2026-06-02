"use client";

import {
  bulkUpdateChapterMicrotopics,
  updateMicrotopicStatus,
} from "@/actions/syllabus";
import {
  bumpSyllabusOutboxFail,
  deleteSyllabusOutbox,
  getAllSyllabusOutbox,
  type SyllabusOutboxOp,
} from "@/lib/syllabusIdb";

let flushing = false;
const MAX_FAIL_BEFORE_DROP = 12;

async function applySyllabusOutboxOp(op: SyllabusOutboxOp): Promise<{ ok: boolean }> {
  if (op.type === "status") {
    const res = await updateMicrotopicStatus(op.syllabusMasterId, op.status);
    return { ok: res.ok };
  }
  const res = await bulkUpdateChapterMicrotopics(
    op.syllabusMasterIds,
    op.status,
  );
  return { ok: res.ok };
}

export async function flushSyllabusOutbox(userId: string | undefined): Promise<void> {
  if (!userId || typeof window === "undefined" || flushing) return;
  flushing = true;
  try {
    const pending = await getAllSyllabusOutbox();
    for (const row of pending) {
      if (row.userId !== userId) continue;
      const fails = row.failCount ?? 0;
      if (fails >= MAX_FAIL_BEFORE_DROP) {
        // react-doctor-disable-next-line react-doctor/async-await-in-loop -- sequential outbox
        await deleteSyllabusOutbox(row.id);
        continue;
      }
      // react-doctor-disable-next-line react-doctor/async-await-in-loop -- sequential outbox
      const res = await applySyllabusOutboxOp(row.op);
      // react-doctor-disable-next-line react-doctor/async-await-in-loop -- sequential outbox
      if (res.ok) await deleteSyllabusOutbox(row.id);
      // react-doctor-disable-next-line react-doctor/async-await-in-loop -- sequential outbox
      else await bumpSyllabusOutboxFail(row.id);
    }
  } catch {
    /* ignore */
  } finally {
    flushing = false;
  }
}
