"use client";

import type { DailyTaskRow } from "@/actions/dailyPlan";
import { timeDbToInput } from "@/lib/dailyPlanTime";
import {
  putVoicePlannerSnapshot,
  voicePlannerSnapshotKey,
  type VoicePlannerSnapshotRow,
} from "@/lib/taskIdb";
import { normalizeVoiceHHMM } from "@/lib/voiceIst";

export type VoicePlannerTableRow = VoicePlannerSnapshotRow;

function durationLabel(start: string | null, end: string | null): string | null {
  const mins =
    start && end
      ? (() => {
          const [sh, sm] = start.split(":").map(Number);
          const [eh, em] = end.split(":").map(Number);
          if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return null;
          let a = sh * 60 + sm;
          let b = eh * 60 + em;
          if (b < a) b += 24 * 60;
          const diff = b - a;
          if (diff <= 0 || diff > 24 * 60) return null;
          return diff;
        })()
      : null;
  if (mins == null) return null;
  if (mins >= 60) {
    return mins % 60 === 0
      ? `${Math.floor(mins / 60)}h`
      : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }
  return `${mins}m`;
}

export function plannerDurationFromTimeInputs(
  startInput: string,
  endInput: string,
): string | null {
  const s = normalizeVoiceHHMM(startInput.trim() || null);
  const e = normalizeVoiceHHMM(endInput.trim() || null);
  return durationLabel(s, e);
}

export function dailyTaskRowToDraftRow(e: DailyTaskRow): VoicePlannerTableRow {
  const st = e.time_start ? timeDbToInput(e.time_start) : "";
  const et = e.time_end ? timeDbToInput(e.time_end) : "";
  const include = e.status !== "skipped";
  return {
    id: e.id,
    include,
    name: e.title?.trim() ?? "",
    startInput: st,
    endInput: et,
    duration: plannerDurationFromTimeInputs(st, et),
    transcriptRaw: e.source_raw_text?.slice(0, 12_000),
    source: e.source as VoicePlannerTableRow["source"],
  };
}

/** @deprecated Use dailyTaskRowToDraftRow */
export function voiceTimelineRowToDraftRow(e: DailyTaskRow): VoicePlannerTableRow {
  return dailyTaskRowToDraftRow(e);
}

export function rowSyncHash(d: VoicePlannerTableRow): string {
  return JSON.stringify({
    n: d.name.trim(),
    s: d.startInput,
    e: d.endInput,
    i: d.include,
    o: d.source ?? "",
  });
}

export async function persistPlannerSnapshotLocal(
  userId: string,
  logDate: string,
  rows: VoicePlannerTableRow[],
  transcriptAggregate: string,
): Promise<void> {
  await putVoicePlannerSnapshot({
    key: voicePlannerSnapshotKey(userId, logDate),
    userId,
    logDate,
    rows,
    transcriptAggregate,
    updatedAt: Date.now(),
  });
}

