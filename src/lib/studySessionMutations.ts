"use client";

import type { TablesInsert } from "@/types/supabase";
import { registerOutboxBackgroundSync } from "@/lib/pwaBackgroundSync";
import { scheduleOutboxFlush } from "@/lib/sync";
import { putStudySessionWithOutboxMutation, getOutboxCount } from "@/lib/taskIdb";
import {
  migrateLegacyStudySessionsIfNeeded,
  type StudySessionLog,
} from "@/lib/studySessionsIdb";
import { useSyncStore } from "@/store/useSyncStore";

/**
 * Offline-first study session: IndexedDB + outbox → Supabase.
 * Synced rows contain only metadata (subject, duration, times, camera flag)—never
 * video, images, or frames.
 */
export async function applyOptimisticStudySessionCreate(
  row: Omit<TablesInsert<"study_sessions">, "user_id"> & { id: string; user_id: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const local: StudySessionLog = {
    id: row.id,
    user_id: row.user_id,
    subject: row.subject,
    duration_seconds: row.duration_seconds,
    is_camera_proven: row.is_camera_proven ?? false,
    started_at: row.started_at,
    ended_at: row.ended_at,
  };

  await migrateLegacyStudySessionsIfNeeded();
  await putStudySessionWithOutboxMutation(local, {
    op: "study_session_create",
    taskId: row.id,
    studySessionInsert: {
      id: row.id,
      subject: row.subject,
      duration_seconds: row.duration_seconds,
      is_camera_proven: row.is_camera_proven ?? false,
      started_at: row.started_at,
      ended_at: row.ended_at,
    },
  });

  const n = await getOutboxCount();
  useSyncStore.getState().setPendingCount(n);
  registerOutboxBackgroundSync().catch(() => {});
  if (typeof navigator !== "undefined" && row.user_id) {
    scheduleOutboxFlush(row.user_id);
  }

  return { ok: true };
}
