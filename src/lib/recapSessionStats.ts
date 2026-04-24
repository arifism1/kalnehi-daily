import { format, isValid, parseISO } from "date-fns";

import type { ExecutionSessionRow } from "@/lib/taskIdb";
import type { StudySessionLog } from "@/lib/studySessionTypes";

/** Calendar day (yyyy-MM-dd) from session end timestamp, local timezone. */
export function recapDayKeyFromEnd(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = parseISO(iso);
  return isValid(d) ? format(d, "yyyy-MM-dd") : null;
}

/**
 * Total study seconds for a calendar day: task-linked execution log +
 * free-form study sessions (timer), by `end_time` / `ended_at`.
 */
export function sumStudySecondsForCalendarDay(
  day: string,
  executionSessions: ExecutionSessionRow[],
  studySessions: StudySessionLog[],
): number {
  let sec = 0;
  for (const s of executionSessions) {
    if (recapDayKeyFromEnd(s.end_time) !== day) continue;
    sec += Math.max(0, s.duration_seconds ?? 0);
  }
  for (const s of studySessions) {
    if (recapDayKeyFromEnd(s.ended_at) !== day) continue;
    sec += Math.max(0, s.duration_seconds ?? 0);
  }
  return sec;
}
