"use client";

import type { DailyTaskRow } from "@/actions/dailyPlan";
import { registerOutboxBackgroundSync } from "@/lib/pwaBackgroundSync";
import { slotFromStartEnd, timeDbToInput } from "@/lib/dailyPlanTime";
import {
  addOutboxMutation,
  getOutboxCount,
  putVoicePlannerSnapshot,
  voicePlannerSnapshotKey,
  type OutboxMutation,
  type VoicePlannerSnapshotRow,
} from "@/lib/taskIdb";
import { normalizeVoiceHHMM } from "@/lib/voiceIst";
import type { TablesUpdate } from "@/types/supabase";
import { useSyncStore } from "@/store/useSyncStore";

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

function draftRowToDailyInsertPayload(
  d: VoicePlannerTableRow,
  logDate: string,
  sourceTextAggregate: string,
  sourceDefault: "voice" | "handwritten",
): NonNullable<OutboxMutation["dailyTaskInsert"]> {
  const title = d.name.trim().slice(0, 500) || "Activity";
  const { time_slot, time_start, time_end } = slotFromStartEnd(
    d.startInput,
    d.endInput,
  );
  const raw =
    (d.transcriptRaw?.trim() || sourceTextAggregate || "").slice(0, 12_000) ||
    null;
  const status = d.include ? "pending" : "skipped";
  const src = d.source ?? sourceDefault;
  return {
    plan_date: logDate,
    id: d.id,
    title,
    time_slot,
    time_start,
    time_end,
    priority: "normal",
    status,
    source:
      src === "typed" || src === "voice" || src === "handwritten"
        ? src
        : sourceDefault,
    source_raw_text: raw,
  };
}

function draftRowToDailyPatch(d: VoicePlannerTableRow): TablesUpdate<"daily_tasks"> {
  const title = d.name.trim().slice(0, 500) || "Activity";
  const { time_slot, time_start, time_end } = slotFromStartEnd(
    d.startInput,
    d.endInput,
  );
  const status = d.include ? "pending" : "skipped";
  return {
    title,
    time_slot,
    time_start,
    time_end,
    status,
    updated_at: new Date().toISOString(),
  };
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

/**
 * Diff-based enqueue: creates / updates / deletes for `daily_tasks` (unified plan).
 */
export async function pushDailyPlannerRowsToOutbox(opts: {
  userId: string;
  logDate: string;
  /** New rows without explicit `source` use this default. */
  sourceDefault: "voice" | "handwritten";
  sourceTextAggregate: string;
  draftRows: VoicePlannerTableRow[];
  serverKnownIds: Set<string>;
  prevIdsRef: { current: Set<string> };
  rowHashRef: { current: Record<string, string> };
  pendingCreateIdsRef: { current: Set<string> };
}): Promise<void> {
  const {
    userId,
    logDate,
    sourceDefault,
    sourceTextAggregate,
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
          op: "daily_task_delete",
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
          op: "daily_task_create",
          taskId: r.id,
          dailyTaskInsert: draftRowToDailyInsertPayload(
            r,
            logDate,
            sourceTextAggregate,
            sourceDefault,
          ),
        });
      }
      continue;
    }

    const h = rowSyncHash(r);
    if (rowHashRef.current[r.id] === h) continue;
    rowHashRef.current[r.id] = h;
    await addOutboxMutation({
      op: "daily_task_update",
      taskId: r.id,
      dailyTaskPatch: draftRowToDailyPatch(r),
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

/** @deprecated Prefer pushDailyPlannerRowsToOutbox with explicit sourceDefault */
export async function pushPlannerRowsToOutbox(
  opts: Omit<Parameters<typeof pushDailyPlannerRowsToOutbox>[0], "sourceDefault"> & {
    sourceDefault?: "voice" | "handwritten";
  },
): Promise<void> {
  return pushDailyPlannerRowsToOutbox({
    ...opts,
    sourceDefault: opts.sourceDefault ?? "voice",
  });
}
