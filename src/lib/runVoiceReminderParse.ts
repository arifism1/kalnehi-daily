import Groq from "groq-sdk";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";

import { getGroqModelCandidates } from "@/lib/groqClient";

const MAX_TRANSCRIPT = 2_000;
const MAX_TITLE = 200;
const MAX_SUBJECT = 200;
const PAST_SKEW_MS = 120_000;
const MAX_FUTURE_MS = 366 * 24 * 60 * 60 * 1000;

function extractOutermostJsonObject(text: string): string | null {
  const objStart = text.indexOf("{");
  if (objStart === -1) return null;
  const end = text.lastIndexOf("}");
  if (end <= objStart) return null;
  return text.slice(objStart, end + 1);
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

function messageContentToString(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    return raw
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: unknown }).text ?? "");
        }
        return "";
      })
      .join("");
  }
  return String(raw);
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

function isWrongModelError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const e = err as { status?: number };
  if (typeof e?.status === "number" && e.status === 404) return true;
  return /decommission|invalid_model|model_not_found|does not exist|unknown model|not supported model/i.test(
    msg,
  );
}

export type VoiceReminderParseInput = {
  transcript: string;
  /** IANA zone from `Intl.DateTimeFormat().resolvedOptions().timeZone` */
  ianaTimeZone: string;
  /** Client clock ISO (helps resolve "tomorrow" / "tonight") */
  nowIso?: string;
};

export type VoiceReminderParseSuccess = {
  title: string;
  remind_at: string;
  subject: string | null;
  groq_model: string;
};

export async function runVoiceReminderParse(
  input: VoiceReminderParseInput,
): Promise<
  | { ok: true; data: VoiceReminderParseSuccess }
  | { ok: false; error: string }
> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "Voice reminders are not configured on the server." };
  }

  const raw = input.transcript.trim().slice(0, MAX_TRANSCRIPT);
  if (!raw) {
    return { ok: false, error: "Nothing was captured to parse." };
  }

  const tz = input.ianaTimeZone.trim().slice(0, 120) || "UTC";
  const nowAnchor = (input.nowIso?.trim() || new Date().toISOString()).slice(0, 40);

  const system = `You convert a student's spoken reminder into structured JSON.
Return ONLY one JSON object (no markdown, no prose). Shape:
{"title":string,"remind_at":string,"subject":string|null}

Rules:
- title: short task label (what to do), max ${MAX_TITLE} chars. No quotes inside.
- remind_at: single RFC3339/ISO-8601 instant when the reminder should fire (include offset like +05:30 or use Z). Must be absolute time the user asked for.
- subject: optional short study subject label (e.g. "Physics", "Aldehydes") or null.

Time context (authoritative for "today", "tomorrow", "in 25 minutes", "7 PM", "tomorrow morning 9 AM"):
- User IANA timezone: ${tz}
- Reference "now" instant (ISO): ${nowAnchor}

Interpret all relative times in the user's timezone. If the utterance is ambiguous, pick the next reasonable future occurrence after the reference instant.
If you cannot determine a time, use remind_at as an empty string (caller will reject).`;

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    { role: "user", content: `Spoken text:\n"""${raw}"""` },
  ];

  const groq = new Groq({ apiKey });
  let lastErr: unknown;
  let groqModelUsed = "";

  for (const model of getGroqModelCandidates("parsing")) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages,
        temperature: 0.1,
        max_tokens: 384,
      });
      groqModelUsed = model;
      const content = messageContentToString(
        completion.choices[0]?.message?.content,
      )
        .replace(/```json\n?/gi, "")
        .replace(/```\n?/g, "")
        .trim();

      let parsed: unknown = tryJsonParse(content);
      if (parsed == null && content) {
        const extracted = extractOutermostJsonObject(content);
        if (extracted) parsed = tryJsonParse(extracted);
      }

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        lastErr = new Error("parse_shape");
        continue;
      }

      const o = parsed as Record<string, unknown>;
      let title =
        typeof o.title === "string" ? o.title.trim() : "";
      if (!title && typeof o.reminder_title === "string") {
        title = o.reminder_title.trim();
      }
      if (title.length > MAX_TITLE) title = title.slice(0, MAX_TITLE);
      if (!title) {
        lastErr = new Error("missing_title");
        continue;
      }

      const remindRaw =
        typeof o.remind_at === "string"
          ? o.remind_at.trim()
          : typeof o.remindAt === "string"
            ? o.remindAt.trim()
            : "";
      if (!remindRaw) {
        lastErr = new Error("missing_time");
        continue;
      }

      const at = new Date(remindRaw);
      if (Number.isNaN(at.getTime())) {
        lastErr = new Error("bad_time");
        continue;
      }

      const nowMs = Date.now();
      if (at.getTime() < nowMs - PAST_SKEW_MS) {
        return { ok: false, error: "That time is already in the past. Try again with a future time." };
      }
      if (at.getTime() > nowMs + MAX_FUTURE_MS) {
        return { ok: false, error: "Reminder time is too far in the future." };
      }

      let subject: string | null =
        typeof o.subject === "string" && o.subject.trim()
          ? o.subject.trim().slice(0, MAX_SUBJECT)
          : null;

      return {
        ok: true,
        data: {
          title,
          remind_at: at.toISOString(),
          subject,
          groq_model: groqModelUsed,
        },
      };
    } catch (e) {
      lastErr = e;
      if (isTransientGroqError(e)) {
        return {
          ok: false,
          error:
            e instanceof Error ? e.message : "Reminder parsing is busy. Try again shortly.",
        };
      }
      if (!isWrongModelError(e)) {
        return {
          ok: false,
          error:
            e instanceof Error ? e.message : "Could not parse this reminder right now.",
        };
      }
    }
  }

  return {
    ok: false,
    error:
      lastErr instanceof Error
        ? lastErr.message
        : "Could not parse this reminder right now.",
  };
}
