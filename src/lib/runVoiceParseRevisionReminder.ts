import { addDays, format, parseISO } from "date-fns";

import { fetchRevisionReminderFromGroq } from "@/lib/voiceRevisionRemindersGroq";
import type { RevisionDifficulty } from "@/lib/engine/revisionSchedule";

const TITLE_MAX = 500;
const NOTES_MAX = 5000;

function normalizeDifficulty(
  raw: unknown,
): RevisionDifficulty {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (s === "hard" || s === "medium" || s === "easy") return s;
  return "medium";
}

function normalizeTitle(raw: unknown, fallback: string): string {
  const t = typeof raw === "string" ? raw.trim() : "";
  if (t.length > 0) return t.slice(0, TITLE_MAX) || "Revision";
  return fallback.slice(0, TITLE_MAX) || "Revision";
}

function normalizeNotes(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) return "";
  return raw.trim().slice(0, NOTES_MAX);
}

function parseNextDue(raw: unknown): { ok: true; value: string } | { ok: false } {
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
    return { ok: true, value: raw.trim() };
  }
  return { ok: false };
}

export type VoiceParsedRevisionReminder = {
  title: string;
  next_due: string;
  difficulty: RevisionDifficulty;
  notes: string;
};

export type ParseRevisionReminderResult =
  | { ok: true; reminder: VoiceParsedRevisionReminder }
  | { ok: false; error: string; openRawFallback?: boolean };

/**
 * Server-side: transcript → one revision reminder. Uses TODAYS_DATE for relative dates.
 */
export async function runVoiceParseRevisionReminder(
  raw: string,
  todayYyyyMmDd: string,
  referenceIso: string,
): Promise<ParseRevisionReminderResult> {
  const baseDate = /^\d{4}-\d{2}-\d{2}$/.test(todayYyyyMmDd)
    ? todayYyyyMmDd
    : format(new Date(), "yyyy-MM-dd");
  const defaultDue = format(addDays(parseISO(baseDate), 7), "yyyy-MM-dd");

  const groq = await fetchRevisionReminderFromGroq(raw, {
    todaysYyyyMmDd: baseDate,
    referenceIso,
  });
  if (groq.outcome === "fallback") {
    const hasKey = Boolean(process.env.GROQ_API_KEY?.trim());
    return {
      ok: false,
      error: hasKey
        ? "Could not reach the voice parser (empty transcript or server misconfiguration)."
        : "Voice structuring needs GROQ_API_KEY on the server. Add details manually in the form.",
      openRawFallback: true,
    };
  }
  if (groq.outcome === "parse_failed" || !groq.row) {
    return {
      ok: false,
      error: "Could not turn that into a reminder. Try again, or type below.",
      openRawFallback: true,
    };
  }
  const { row } = groq;
  const transcriptForFallback = raw.trim().slice(0, TITLE_MAX) || "Revision";

  let nextDue: string;
  const nd = parseNextDue(row.next_due);
  if (nd.ok) {
    nextDue =
      nd.value < baseDate
        ? defaultDue
        : nd.value;
  } else {
    nextDue = defaultDue;
  }

  return {
    ok: true,
    reminder: {
      title: normalizeTitle(row.title, transcriptForFallback),
      next_due: nextDue,
      difficulty: normalizeDifficulty(row.difficulty),
      notes: normalizeNotes(row.notes),
    },
  };
}
