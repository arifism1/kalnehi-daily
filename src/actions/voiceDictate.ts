"use server";

import { revalidatePath } from "next/cache";

import { incrementVoiceMinuteUsage } from "@/actions/subscription";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  fetchVoiceTasksFromGroq,
  GROQ_VOICE_MODEL,
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
import type { Json, TablesInsert } from "@/types/supabase";
import { runVoiceParseDraft } from "@/lib/runVoiceParseDraft";
import type {
  VoiceDictateFailure,
  VoiceDictateInput,
  VoiceDictateSuccess,
  VoiceDictateSuccessParsed,
} from "@/lib/voiceDictateTypes";

/** Structural copy of VoiceDraftTask — avoid that symbol in `"use server"` signatures (Turbopack can emit it at runtime). */
type VoiceDraftRow = {
  taskTitle: string;
  start_time: string | null;
  end_time: string | null;
  duration: string | null;
};

/**
 * Turn a Groq task (name + optional IST HH:MM) into a row for voice_timeline_entries.
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
 * Core pipeline: Groq parse → insert `voice_timeline_entries` (one row per task).
 * Passes to Groq: `occurredAtIso` (CURRENT_TIME_ISO + derived CURRENT_IST_HHMM) and `logDate` (LOG_DATE).
 * On missing API key / empty transcript, returns `mode: "fallback"` for raw save UI.
 */
export async function runVoiceDictationPipeline(
  transcript: string,
  logDate: string,
  occurredAtIso: string,
): Promise<VoiceDictateSuccess | VoiceDictateFailure> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: USER_ERROR.session };
  }

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

  const entryIds: string[] = [];
  let preview: ParsedVoiceDayEntry | undefined;

  for (const task of groq.tasks) {
    const rowParsed = taskToParsedEntry(task);
    if (!preview) preview = rowParsed;

    const st = normalizeVoiceHHMM(task.start_time ?? null);
    const et = normalizeVoiceHHMM(task.end_time ?? null);

    const parsed_json: Json = {
      name: task.name,
      start_time: st,
      end_time: et,
      groq_model: GROQ_VOICE_MODEL,
    } as unknown as Json;

    const row: TablesInsert<"voice_timeline_entries"> = {
      user_id: user.id,
      log_date: logDate,
      transcript_raw: raw,
      title: rowParsed.title,
      description: rowParsed.description,
      category: rowParsed.category,
      subject: rowParsed.subject,
      chapter: rowParsed.chapter,
      estimated_minutes: rowParsed.estimated_minutes,
      occurred_at: occurredAtIso,
      parsed_json,
    };

    const { data: inserted, error } = await supabase
      .from("voice_timeline_entries")
      .insert(row)
      .select("id")
      .single();

    if (error || !inserted?.id) {
      return { ok: false, error: USER_ERROR.tryAgain };
    }
    entryIds.push(inserted.id);
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
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: USER_ERROR.session };
  }

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

  const parsed_json: Json = {
    groq_model: GROQ_VOICE_MODEL,
    raw_fallback: true,
    start_time: nowIst,
    end_time: null,
  } as unknown as Json;

  const row: TablesInsert<"voice_timeline_entries"> = {
    user_id: user.id,
    log_date: logDate,
    transcript_raw: raw,
    title: rowParsed.title,
    description: rowParsed.description,
    category: rowParsed.category,
    subject: rowParsed.subject,
    chapter: rowParsed.chapter,
    estimated_minutes: rowParsed.estimated_minutes,
    occurred_at: occurredAt,
    parsed_json,
  };

  const { data: inserted, error } = await supabase
    .from("voice_timeline_entries")
    .insert(row)
    .select("id")
    .single();

  if (error || !inserted?.id) {
    return { ok: false, error: USER_ERROR.tryAgain };
  }

  revalidatePath("/dictate-day");
  revalidatePath("/daily-log");

  return {
    ok: true,
    mode: "parsed",
    entryIds: [inserted.id],
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
  return runVoiceDictationPipeline(input.transcript ?? "", logDate, occurredAt);
}

/**
 * Parse only (no DB writes): transcript -> draft task rows for table review.
 */
export async function parseVoiceTranscriptToDraft(
  input: VoiceDictateInput,
): Promise<{ ok: true; tasks: VoiceDraftRow[] } | VoiceDictateFailure> {
  const usageCheck = await incrementVoiceMinuteUsage(1);
  if (!usageCheck.ok) {
    return { ok: false, error: usageCheck.error };
  }

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

  return runVoiceParseDraft(raw, logDate, occurredAt);
}

/**
 * Save reviewed draft rows ONLY to Dictate My Day timeline table.
 */
export async function saveVoiceDraftToTimeline(
  input: {
    log_date: string;
    transcript_raw: string;
    occurred_at?: string;
    tasks: VoiceDraftRow[];
  },
): Promise<{ ok: true; entryIds: string[] } | VoiceDictateFailure> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: USER_ERROR.session };

  const logDate = input.log_date?.trim() ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate)) {
    return { ok: false, error: "Invalid date." };
  }
  const occurredAt =
    typeof input.occurred_at === "string" && input.occurred_at.trim()
      ? input.occurred_at.trim()
      : new Date().toISOString();
  const raw = (input.transcript_raw ?? "").trim().slice(0, 12_000);
  if (!raw) return { ok: false, error: "Nothing to save." };

  const cleaned = input.tasks
    .map((t) => ({
      name: t.taskTitle.trim().slice(0, 200),
      start_time: normalizeVoiceHHMM(t.start_time ?? null),
      end_time: normalizeVoiceHHMM(t.end_time ?? null),
    }))
    .filter((t) => t.name.length > 0);

  if (cleaned.length === 0) {
    return { ok: false, error: "Add at least one task row before saving." };
  }

  const entryIds: string[] = [];
  for (const task of cleaned) {
    const rowParsed = taskToParsedEntry(task);
    const parsed_json: Json = {
      name: task.name,
      start_time: task.start_time,
      end_time: task.end_time,
      groq_model: GROQ_VOICE_MODEL,
      manual_reviewed: true,
    } as unknown as Json;

    const row: TablesInsert<"voice_timeline_entries"> = {
      user_id: user.id,
      log_date: logDate,
      transcript_raw: raw,
      title: rowParsed.title,
      description: rowParsed.description,
      category: rowParsed.category,
      subject: rowParsed.subject,
      chapter: rowParsed.chapter,
      estimated_minutes: rowParsed.estimated_minutes,
      occurred_at: occurredAt,
      parsed_json,
    };

    const { data: inserted, error } = await supabase
      .from("voice_timeline_entries")
      .insert(row)
      .select("id")
      .single();
    if (error || !inserted?.id) return { ok: false, error: USER_ERROR.tryAgain };
    entryIds.push(inserted.id);
  }

  revalidatePath("/dictate-day");
  revalidatePath("/daily-log");
  return { ok: true, entryIds };
}
