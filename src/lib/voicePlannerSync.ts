"use client";

import type { VoiceTimelineRow } from "@/actions/voiceTimeline";
import { GROQ_VOICE_MODEL } from "@/lib/voiceDictateGroq";
import { registerOutboxBackgroundSync } from "@/lib/pwaBackgroundSync";
import {
  addOutboxMutation,
  getOutboxCount,
  putVoicePlannerSnapshot,
  voicePlannerSnapshotKey,
  type VoicePlannerSnapshotRow,
} from "@/lib/taskIdb";
import {
  buildScheduleDescription,
  inferCategoryFromTaskName,
} from "@/lib/voiceTimelineInfer";
import { minutesBetweenHHMM, normalizeVoiceHHMM } from "@/lib/voiceIst";
import type { Json, TablesInsert, TablesUpdate } from "@/types/supabase";
import { useSyncStore } from "@/store/useSyncStore";

export type VoicePlannerTableRow = VoicePlannerSnapshotRow;

function durationLabel(start: string | null, end: string | null): string | null {
  const mins = minutesBetweenHHMM(start, end);
  if (mins == null) return null;
  if (mins >= 60) {
    return mins % 60 === 0
      ? `${Math.floor(mins / 60)}h`
      : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }
  return `${mins}m`;
}

function timeInputToDb(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  return normalizeVoiceHHMM(t);
}

export function voiceTimelineRowToDraftRow(
  e: VoiceTimelineRow,
): VoicePlannerTableRow {
  const pj =
    e.parsed_json && typeof e.parsed_json === "object"
      ? (e.parsed_json as Record<string, unknown>)
      : {};
  const st = typeof pj.start_time === "string" ? pj.start_time : null;
  const et = typeof pj.end_time === "string" ? pj.end_time : null;
  const startNorm = normalizeVoiceHHMM(st);
  const endNorm = normalizeVoiceHHMM(et);
  const startInput =
    startNorm && /^\d{2}:\d{2}$/.test(startNorm) ? startNorm : "";
  const endInput = endNorm && /^\d{2}:\d{2}$/.test(endNorm) ? endNorm : "";
  const include = pj.planner_include !== false;
  return {
    id: e.id,
    include,
    name: e.title?.trim() ?? "",
    startInput,
    endInput,
    duration: durationLabel(startNorm, endNorm),
    transcriptRaw: e.transcript_raw?.slice(0, 12_000),
  };
}

function buildParsedJson(
  d: VoicePlannerTableRow,
  title: string,
  start: string | null,
  end: string | null,
): Json {
  return {
    name: title,
    start_time: start,
    end_time: end,
    planner_include: d.include,
    groq_model: GROQ_VOICE_MODEL,
    auto_saved: true,
  } as unknown as Json;
}

function draftRowToInsert(
  d: VoicePlannerTableRow,
  logDate: string,
  transcriptFallback: string,
): Omit<TablesInsert<"voice_timeline_entries">, "user_id"> {
  const title = d.name.trim().slice(0, 200) || "Activity";
  const start = timeInputToDb(d.startInput);
  const end = timeInputToDb(d.endInput);
  const description = buildScheduleDescription(start, end);
  const estimated_minutes = minutesBetweenHHMM(start, end);
  const category = inferCategoryFromTaskName(title);
  const raw =
    (d.transcriptRaw?.trim() || transcriptFallback || "").slice(0, 12_000) ||
    " ";
  const transcript_raw = raw.length > 0 ? raw : " ";
  const parsed_json = buildParsedJson(d, title, start, end);
  return {
    id: d.id,
    log_date: logDate,
    transcript_raw,
    title,
    description,
    category,
    subject: null,
    chapter: null,
    estimated_minutes,
    occurred_at: new Date().toISOString(),
    parsed_json,
  };
}

function draftRowToUpdate(
  d: VoicePlannerTableRow,
): TablesUpdate<"voice_timeline_entries"> {
  const title = d.name.trim().slice(0, 200) || "Activity";
  const start = timeInputToDb(d.startInput);
  const end = timeInputToDb(d.endInput);
  const description = buildScheduleDescription(start, end);
  const estimated_minutes = minutesBetweenHHMM(start, end);
  const category = inferCategoryFromTaskName(title);
  const parsed_json = buildParsedJson(d, title, start, end);
  return {
    title,
    description,
    category,
    estimated_minutes,
    parsed_json,
  };
}

export function plannerDurationFromTimeInputs(
  startInput: string,
  endInput: string,
): string | null {
  return durationLabel(timeInputToDb(startInput), timeInputToDb(endInput));
}

export function rowSyncHash(d: VoicePlannerTableRow): string {
  return JSON.stringify({
    n: d.name.trim(),
    s: d.startInput,
    e: d.endInput,
    i: d.include,
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

/**
 * Diff-based enqueue: creates / updates / deletes for voice_timeline_entries.
 * Caller seeds serverKnownIds, rowHashRef, prevIdsRef after a successful server load.
 */
export async function pushPlannerRowsToOutbox(opts: {
  userId: string;
  logDate: string;
  transcriptAggregate: string;
  draftRows: VoicePlannerTableRow[];
  serverKnownIds: Set<string>;
  prevIdsRef: { current: Set<string> };
  rowHashRef: { current: Record<string, string> };
  pendingCreateIdsRef: { current: Set<string> };
}): Promise<void> {
  const {
    userId,
    logDate,
    transcriptAggregate,
    draftRows,
    serverKnownIds,
    prevIdsRef,
    rowHashRef,
    pendingCreateIdsRef,
  } = opts;

  const currIds = new Set(draftRows.map((r) => r.id));

  for (const id of prevIdsRef.current) {
    if (!currIds.has(id)) {
      pendingCreateIdsRef.current.delete(id);
      if (serverKnownIds.has(id)) {
        await addOutboxMutation({
          op: "voice_timeline_delete",
          taskId: id,
        });
        serverKnownIds.delete(id);
        delete rowHashRef.current[id];
      }
    }
  }

  for (const r of draftRows) {
    if (!serverKnownIds.has(r.id)) {
      if (!r.name.trim()) continue;
      if (!pendingCreateIdsRef.current.has(r.id)) {
        pendingCreateIdsRef.current.add(r.id);
        await addOutboxMutation({
          op: "voice_timeline_create",
          taskId: r.id,
          voiceInsert: draftRowToInsert(r, logDate, transcriptAggregate),
        });
      }
      continue;
    }

    const h = rowSyncHash(r);
    if (rowHashRef.current[r.id] === h) continue;
    rowHashRef.current[r.id] = h;
    await addOutboxMutation({
      op: "voice_timeline_update",
      taskId: r.id,
      voicePatch: draftRowToUpdate(r),
    });
  }

  prevIdsRef.current = new Set(currIds);

  const n = await getOutboxCount();
  useSyncStore.getState().setPendingCount(n);
  registerOutboxBackgroundSync().catch(() => {});
  void import("@/lib/sync").then(({ scheduleOutboxFlush }) => {
    if (typeof navigator !== "undefined" && navigator.onLine) {
      scheduleOutboxFlush(userId);
    }
  });
}
