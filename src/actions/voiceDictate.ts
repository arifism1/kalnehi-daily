"use server";

import { revalidatePath } from "next/cache";

import { deleteDailyTask, insertDailyTask } from "@/actions/dailyPlan";
import {
  incrementVoiceUsageFromSession,
  peekVoiceQuotaForBilledSeconds,
} from "@/actions/subscription";
import { slotFromStartEnd } from "@/lib/dailyPlanTime";
import {
  fetchVoiceTasksFromGroq,
  type GroqVoiceTask,
} from "@/lib/voiceDictateGroq";
import { USER_ERROR } from "@/lib/userFacingErrors";
import {
  isoToIST_HHMM,
  minutesBetweenHHMM,
  normalizeVoiceHHMM,
} from "@/lib/voiceIst";
import {
  normalizeParsedVoiceEntry,
  type ParsedVoiceDayEntry,
} from "@/lib/voiceDayParse";
import {
  buildScheduleDescription,
  inferCategoryFromTaskName,
} from "@/lib/voiceTimelineInfer";
import { runVoiceParseDraft } from "@/lib/runVoiceParseDraft";
import {
  normalizeDurationSecondsFromRequest,
} from "@/lib/voiceSessionBilling";
import type {
  VoiceDictateFailure,
  VoiceDictateInput,
  VoiceDictateSuccess,
  VoiceDictateSuccessParsed,
} from "@/lib/voiceDictateTypes";

async function deleteInsertedTaskIds(entryIds: string[]): Promise<void> {
  for (const id of entryIds) {
    const del = await deleteDailyTask(id);
    if (!del.ok) {
      console.error("[voiceDictate] deleteInsertedTaskIds failed for", id, del.error);
    }
  }
}

/** Structural copy of VoiceDraftTask — avoid that symbol in `"use server"` signatures (Turbopack can emit it at runtime). */
type VoiceDraftRow = {
  taskTitle: string;
  start_time: string | null;
  end_time: string | null;
  duration: string | null;
  syllabus_master_id?: string | null;
};

/**
 * Turn a Groq task (name + optional IST HH:MM) into a parsed preview row.
 */
function taskToParsedEntry(task: GroqVoiceTask): ParsedVoiceDayEntry {
  const title = task.name.trim().slice(0, 200) || "Activity";
  const start = normalizeVoiceHHMM(task.start_time ?? null);
  const end = normalizeVoiceHHMM(task.end_time ?? null);
  const description = buildScheduleDescription(start, end);
  const estimated_minutes = minutesBetweenHHMM(start, end);
  const category = inferCategoryFromTaskName(title);
  return {
    title,
    description,
    category,
    subject: null,
    chapter: null,
    estimated_minutes,
  };
}

/**
 * Core pipeline: Groq parse → insert unified `daily_tasks` (one row per task).
 * Passes to Groq: `occurredAtIso` (CURRENT_TIME_ISO + derived CURRENT_IST_HHMM) and `logDate` (LOG_DATE).
 * On missing API key / empty transcript, returns `mode: "fallback"` for raw save UI.
 */
export async function runVoiceDictationPipeline(
  transcript: string,
  logDate: string,
  occurredAtIso: string,
  durationSecondsRaw?: unknown,
): Promise<VoiceDictateSuccess | VoiceDictateFailure> {
  const raw = transcript.trim().slice(0, 12_000);
  if (!raw) {
    return { ok: false, error: "Nothing was captured to save." };
  }

  const groq = await fetchVoiceTasksFromGroq(raw, {
    referenceIso: occurredAtIso,
    logDate,
  });
  if (groq.outcome === "fallback") {
    return { ok: true, mode: "fallback", transcript: raw };
  }
  if (groq.outcome !== "structured") {
    return { ok: true, mode: "fallback", transcript: raw };
  }

  const billed = normalizeDurationSecondsFromRequest(durationSecondsRaw);
  const peek = await peekVoiceQuotaForBilledSeconds(billed);
  if (!peek.ok) {
    return { ok: false, error: peek.error };
  }

  const entryIds: string[] = [];
  let preview: ParsedVoiceDayEntry | undefined;

  for (const task of groq.tasks) {
    const rowParsed = taskToParsedEntry(task);
    if (!preview) preview = rowParsed;

    const st = normalizeVoiceHHMM(task.start_time ?? null);
    const et = normalizeVoiceHHMM(task.end_time ?? null);
    const si = st && /^\d{2}:\d{2}$/.test(st) ? st : "";
    const ei = et && /^\d{2}:\d{2}$/.test(et) ? et : "";
    const { time_slot, time_start, time_end } = slotFromStartEnd(si, ei);
    const id = crypto.randomUUID();

    const ins = await insertDailyTask({
      plan_date: logDate,
      id,
      title: rowParsed.title,
      time_slot,
      time_start,
      time_end,
      source: "voice",
      source_raw_text: raw,
    });
    if (!ins.ok) {
      await deleteInsertedTaskIds(entryIds);
      return { ok: false, error: ins.error };
    }
    entryIds.push(id);
  }

  const usageCheck = await incrementVoiceUsageFromSession(billed);
  if (!usageCheck.ok) {
    await deleteInsertedTaskIds(entryIds);
    return { ok: false, error: usageCheck.error };
  }

  revalidatePath("/dictate-day");
  revalidatePath("/daily-log");

  return { ok: true, mode: "parsed", entryIds, preview };
}

/**
 * Save a single timeline row from raw transcript (no Groq). Used when parsing failed or user prefers raw.
 */
export async function saveRawVoiceNote(
  input: VoiceDictateInput,
): Promise<VoiceDictateSuccessParsed | VoiceDictateFailure> {
  const logDate = input.log_date?.trim() ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate)) {
    return { ok: false, error: "Invalid date." };
  }

  const raw = (input.transcript ?? "").trim().slice(0, 12_000);
  if (!raw) {
    return { ok: false, error: "Nothing to save." };
  }

  const occurredAt = input.occurred_at ?? new Date().toISOString();
  const nowIst = isoToIST_HHMM(occurredAt);

  const firstLine = raw.split(/\n/)[0]?.trim() || raw;
  const rowParsed = normalizeParsedVoiceEntry({
    title: firstLine.slice(0, 200) || "Voice note",
    description: `From ${nowIst} IST (saved as raw note) · ${raw.slice(0, 3500)}`,
    category: inferCategoryFromTaskName(firstLine),
  });

  const si = nowIst && /^\d{2}:\d{2}$/.test(nowIst) ? nowIst : "";
  const { time_slot, time_start, time_end } = slotFromStartEnd(si, "");
  const id = crypto.randomUUID();

  const ins = await insertDailyTask({
    plan_date: logDate,
    id,
    title: rowParsed.title,
    time_slot,
    time_start,
    time_end,
    source: "voice",
    source_raw_text: raw,
  });
  if (!ins.ok) {
    return { ok: false, error: ins.error };
  }

  const usageCheck = await incrementVoiceUsageFromSession(
    normalizeDurationSecondsFromRequest(input.duration_seconds),
  );
  if (!usageCheck.ok) {
    const del = await deleteDailyTask(id);
    if (!del.ok) {
      return { ok: false, error: "Could not complete save. Please try again." };
    }
    return { ok: false, error: usageCheck.error };
  }

  revalidatePath("/dictate-day");
  revalidatePath("/daily-log");

  return {
    ok: true,
    mode: "parsed",
    entryIds: [id],
    preview: rowParsed,
  };
}

/**
 * Public server action: send transcript after client-side Web Speech capture.
 * `occurred_at` should be when the user stopped speaking (ISO) — used as "current time" for parsing "now"/abhi.
 * (Audio is not sent; Groq receives text + timestamps only.)
 */
export async function parseVoiceNoteWithGroq(
  input: VoiceDictateInput,
): Promise<VoiceDictateSuccess | VoiceDictateFailure> {
  const logDate = input.log_date?.trim() ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate)) {
    return { ok: false, error: "Invalid date." };
  }
  const occurredAt =
    typeof input.occurred_at === "string" && input.occurred_at.trim()
      ? input.occurred_at.trim()
      : new Date().toISOString();
  return runVoiceDictationPipeline(
    input.transcript ?? "",
    logDate,
    occurredAt,
    input.duration_seconds,
  );
}

/**
 * Parse only (no DB writes): transcript -> draft task rows for table review.
 */
export async function parseVoiceTranscriptToDraft(
  input: VoiceDictateInput,
): Promise<{ ok: true; tasks: VoiceDraftRow[] } | VoiceDictateFailure> {
  const logDate = input.log_date?.trim() ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate)) {
    return { ok: false, error: "Invalid date." };
  }
  const occurredAt =
    typeof input.occurred_at === "string" && input.occurred_at.trim()
      ? input.occurred_at.trim()
      : new Date().toISOString();
  const raw = (input.transcript ?? "").trim().slice(0, 12_000);
  if (!raw) return { ok: false, error: "Nothing was captured to parse." };

  const billed = normalizeDurationSecondsFromRequest(input.duration_seconds);
  const prePeek = await peekVoiceQuotaForBilledSeconds(billed);
  if (!prePeek.ok) {
    return { ok: false, error: prePeek.error };
  }

  const draft = await runVoiceParseDraft(raw, logDate, occurredAt);
  if (!draft.ok) return draft;

  const usageCheck = await incrementVoiceUsageFromSession(billed);
  if (!usageCheck.ok) {
    return { ok: false, error: usageCheck.error };
  }

  return draft;
}

/**
 * Save reviewed draft rows to the unified daily plan (`daily_tasks`).
 */
export async function saveVoiceDraftToTimeline(
  input: {
    log_date: string;
    transcript_raw: string;
    occurred_at?: string;
    tasks: VoiceDraftRow[];
  },
): Promise<{ ok: true; entryIds: string[] } | VoiceDictateFailure> {
  const logDate = input.log_date?.trim() ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate)) {
    return { ok: false, error: "Invalid date." };
  }
  const raw = (input.transcript_raw ?? "").trim().slice(0, 12_000);
  if (!raw) return { ok: false, error: "Nothing to save." };

  const cleaned = input.tasks
    .map((t) => ({
      name: t.taskTitle.trim().slice(0, 200),
      start_time: normalizeVoiceHHMM(t.start_time ?? null),
      end_time: normalizeVoiceHHMM(t.end_time ?? null),
      syllabus_master_id: t.syllabus_master_id ?? null,
    }))
    .filter((t) => t.name.length > 0);

  if (cleaned.length === 0) {
    return { ok: false, error: "Add at least one task row before saving." };
  }

  const entryIds: string[] = [];
  for (const task of cleaned) {
    const rowParsed = taskToParsedEntry({
      name: task.name,
      start_time: task.start_time,
      end_time: task.end_time,
    });
    const si =
      task.start_time && /^\d{2}:\d{2}$/.test(task.start_time)
        ? task.start_time
        : "";
    const ei =
      task.end_time && /^\d{2}:\d{2}$/.test(task.end_time) ? task.end_time : "";
    const { time_slot, time_start, time_end } = slotFromStartEnd(si, ei);
    const id = crypto.randomUUID();
    const ins = await insertDailyTask({
      plan_date: logDate,
      id,
      title: rowParsed.title,
      time_slot,
      time_start,
      time_end,
      source: "voice",
      source_raw_text: raw,
      syllabus_master_id: task.syllabus_master_id ?? null,
    });
    if (!ins.ok) return { ok: false, error: ins.error };
    entryIds.push(id);
  }

  revalidatePath("/dictate-day");
  revalidatePath("/daily-log");
  return { ok: true, entryIds };
}
