/**
 * Central Groq **chat completions** routing by task kind.
 *
 * Env overrides (optional):
 * - `GROQ_MODEL_PARSING` — Dictate / voice-parse-draft / handwritten structured parse (default: cheap 8B).
 * - `GROQ_MODEL_CHAT` — PrepBrain chat (default: 8B).
 * - `GROQ_MODEL_REASONING` — reserved for future use (default: same as parsing).
 *
 * Legacy: `GROQ_DEFAULT_MODEL` applies only to **chat** if `GROQ_MODEL_CHAT` is unset.
 *
 * Does not apply to `groq.audio.transcriptions` (Whisper).
 */

export type GroqTaskType = "parsing" | "chat" | "reasoning";

/** Default chat (cheap) — PrepBrain. */
export const GROQ_DEFAULT_CHAT_ID = "llama-3.1-8b-instant" as const;

/** Default parsing / reasoning (cheap) — voice, paste plan, etc. */
export const GROQ_DEFAULT_PARSING_ID = "llama-3.1-8b-instant" as const;

/** Same id as {@link GROQ_DEFAULT_CHAT_ID} — dev `?model=8b` shortcuts. */
export const GROQ_CHAT_8B_INSTANT = GROQ_DEFAULT_CHAT_ID;

/** Legacy 70B pair — dev `?model=70b`, plus failover after the primary model for chat/parsing/reasoning. */
export const GROQ_LEGACY_70B_VERSATILE_CHAIN: readonly string[] = [
  "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile",
];

export function getGroqModel(taskType: GroqTaskType): string {
  if (taskType === "parsing") {
    const v = process.env.GROQ_MODEL_PARSING?.trim();
    return v && v.length > 0 ? v : GROQ_DEFAULT_PARSING_ID;
  }
  if (taskType === "chat") {
    const v = process.env.GROQ_MODEL_CHAT?.trim();
    if (v && v.length > 0) return v;
    const legacy = process.env.GROQ_DEFAULT_MODEL?.trim();
    if (legacy && legacy.length > 0) return legacy;
    return GROQ_DEFAULT_CHAT_ID;
  }
  if (taskType === "reasoning") {
    const v = process.env.GROQ_MODEL_REASONING?.trim();
    return v && v.length > 0 ? v : GROQ_DEFAULT_PARSING_ID;
  }
  const _never: never = taskType;
  void _never;
  return GROQ_DEFAULT_CHAT_ID;
}

/**
 * Models to try in order for `chat.completions` (wrong-model / decommission retries).
 * All task kinds: primary (defaults to cheap 8B) plus legacy 70B chain (deduped).
 */
export function getGroqModelCandidates(taskType: GroqTaskType): string[] {
  const primary = getGroqModel(taskType);
  const out: string[] = [primary];
  for (const m of GROQ_LEGACY_70B_VERSATILE_CHAIN) {
    if (!out.includes(m)) out.push(m);
  }
  return out;
}
