import type { ParsedVoiceDayEntry } from "@/lib/voiceDayParse";

export type VoiceDictateInput = {
  transcript: string;
  log_date: string;
  occurred_at?: string;
};

/** Groq parsed one or more tasks; rows were inserted. */
export type VoiceDictateSuccessParsed = {
  ok: true;
  mode: "parsed";
  entryIds: string[];
  preview?: ParsedVoiceDayEntry;
};

/**
 * Groq unavailable, bad JSON, or empty parse — client shows raw transcript + save actions.
 * Nothing is inserted until the user saves.
 */
export type VoiceDictateSuccessFallback = {
  ok: true;
  mode: "fallback";
  transcript: string;
};

export type VoiceDictateSuccess =
  | VoiceDictateSuccessParsed
  | VoiceDictateSuccessFallback;

export type VoiceDictateFailure = {
  ok: false;
  /** User-safe only (session, validation, DB); never “couldn’t parse”. */
  error: string;
  /** Dictate draft: show raw transcript panel instead of a fake single “parsed” row. */
  openRawFallback?: boolean;
};
