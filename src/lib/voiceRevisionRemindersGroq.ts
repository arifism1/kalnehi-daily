import Groq from "groq-sdk";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";

import { GROQ_DEFAULT_PARSING_ID } from "@/lib/groqClient";
import { VOICE_REVISION_REMINDER_SYSTEM_PROMPT } from "@/lib/voiceRevisionPrompts";
import { normalizeVoiceTranscriptForParsing } from "@/lib/voiceTranscriptNormalize";

const MAX_TRANSCRIPT_CHARS = 12_000;

export type GroqRevisionReminderRow = {
  title?: unknown;
  next_due?: unknown;
  difficulty?: unknown;
  notes?: unknown;
};

export type RevisionGroqContext = {
  referenceIso: string;
  todaysYyyyMmDd: string;
};

type GroqFetchOutcome =
  | { outcome: "structured"; row: GroqRevisionReminderRow }
  | { outcome: "fallback" }
  | { outcome: "parse_failed" };

function messageContentToString(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    return raw
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: string }).text ?? "");
        }
        return "";
      })
      .join("");
  }
  return String(raw);
}

function tryJsonParse(s: string): unknown | null {
  try {
    return JSON.parse(s);
  } catch {
    try {
      return JSON.parse(s.replace(/,\s*([}\]])/g, "$1"));
    } catch {
      return null;
    }
  }
}

/** Extract first `{ ... }` from model text. */
function extractOutermostObject(text: string): string | null {
  const s = text.indexOf("{");
  if (s === -1) return null;
  const e = text.lastIndexOf("}");
  if (e <= s) return null;
  return text.slice(s, e + 1);
}

function extractRowFromContent(content: string): GroqRevisionReminderRow | null {
  const cleaned = content
    .replace(/```json\n?/gi, "")
    .replace(/```\n?/g, "")
    .trim();
  let parsed: unknown = tryJsonParse(cleaned);
  if (parsed == null) {
    const ext = extractOutermostObject(cleaned);
    if (ext) parsed = tryJsonParse(ext);
  }
  if (parsed == null) return null;
  if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object") {
    return parsed[0] as GroqRevisionReminderRow;
  }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed as GroqRevisionReminderRow;
  }
  return null;
}

function isWrongModelError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const e = err as { status?: number };
  if (e?.status === 404) return true;
  return /decommission|invalid_model|model_not_found|does not exist|unknown model|not supported model/i.test(
    msg,
  );
}

function isTransientGroqError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  if (/429|503|502|500|timeout|ETIMEDOUT|ECONNRESET|rate limit/i.test(msg)) {
    return true;
  }
  const e = err as { status?: number };
  if (typeof e?.status === "number" && e.status >= 500) return true;
  if (e?.status === 429) return true;
  return false;
}

async function groqChat(
  apiKey: string,
  messages: ChatCompletionMessageParam[],
  opts: { temperature: number; max_tokens: number },
): Promise<string> {
  const groq = new Groq({ apiKey });
  let lastErr: unknown;
  for (const model of [GROQ_DEFAULT_PARSING_ID]) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        ...opts,
        messages,
      });
      return messageContentToString(completion.choices[0]?.message?.content);
    } catch (e) {
      lastErr = e;
      if (isTransientGroqError(e)) throw e;
      if (!isWrongModelError(e)) throw e;
    }
  }
  throw lastErr;
}

function buildUserMessage(
  trimmed: string,
  ctx: RevisionGroqContext,
): string {
  return `TODAYS_DATE: ${ctx.todaysYyyyMmDd}
REFERENCE_TIME_ISO: ${ctx.referenceIso}

Transcript:
"""${trimmed}"""

Return ONLY the JSON object for one revision reminder, per system rules.`;
}

/**
 * Transcript → one revision object via Groq (same model stack as voice-parse-draft).
 */
export async function fetchRevisionReminderFromGroq(
  transcript: string,
  ctx: RevisionGroqContext,
): Promise<GroqFetchOutcome> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return { outcome: "fallback" };
  }
  const trimmed = normalizeVoiceTranscriptForParsing(
    transcript.trim().slice(0, MAX_TRANSCRIPT_CHARS),
  );
  if (!trimmed) {
    return { outcome: "fallback" };
  }
  const run = async (): Promise<GroqFetchOutcome> => {
    const content = await groqChat(
      apiKey,
      [
        { role: "system", content: VOICE_REVISION_REMINDER_SYSTEM_PROMPT },
        { role: "user", content: buildUserMessage(trimmed, ctx) },
      ],
      { temperature: 0.12, max_tokens: 1024 },
    );
    const row = extractRowFromContent(content);
    if (!row) return { outcome: "parse_failed" };
    return { outcome: "structured", row };
  };
  try {
    return await run();
  } catch (first) {
    if (!isTransientGroqError(first)) {
      return { outcome: "parse_failed" };
    }
    try {
      return await run();
    } catch {
      return { outcome: "parse_failed" };
    }
  }
}
