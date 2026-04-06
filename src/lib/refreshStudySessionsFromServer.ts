"use client";

import { fetchStudySessionsForLog } from "@/actions/userStudySessions";
import { mergeStudySessions, type StudySessionLog } from "@/lib/studySessionsIdb";

const DEFAULT_SINCE_YEARS = 4;

export async function refreshStudySessionsFromServer(): Promise<void> {
  const since = new Date();
  since.setFullYear(since.getFullYear() - DEFAULT_SINCE_YEARS);
  const sinceIso = since.toISOString();

  const res = await fetchStudySessionsForLog(sinceIso, 4000);
  if (!res.ok) return;

  const rows: StudySessionLog[] = res.rows.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    subject: r.subject,
    duration_seconds: r.duration_seconds,
    is_camera_proven: r.is_camera_proven,
    started_at: r.started_at,
    ended_at: r.ended_at,
  }));

  await mergeStudySessions(rows);
}
