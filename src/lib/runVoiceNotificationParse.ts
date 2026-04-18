import Groq from "groq-sdk";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";

import { getGroqModelCandidates } from "@/lib/groqClient";

const MAX_TRANSCRIPT = 2_000;
const MAX_TITLE = 200;
const MAX_SUBJECT = 200;
const MAX_CHAPTER = 200;
const PAST_SKEW_MS = 120_000;
const MAX_FUTURE_MS = 366 * 24 * 60 * 60 * 1000;

const TAGS = new Set(["Revision", "Study", "Break", "Admin", "Other"]);
const REPEATS = new Set(["once", "daily", "weekly"]);

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

function normalizeTag(raw: unknown): string {
  if (typeof raw !== "string") return "Study";
  const t = raw.trim();
  if (TAGS.has(t)) return t;
  return "Study";
}

function normalizeRepeat(raw: unknown): "once" | "daily" | "weekly" {
  if (typeof raw !== "string") return "once";
  const r = raw.trim().toLowerCase();
  if (r === "daily" || r === "weekly" || r === "once") return r;
  if (r === "every day" || r === "everyday") return "daily";
  if (r === "every week") return "weekly";
  return "once";
}

export type VoiceNotificationParseInput = {
  transcript: string;
  ianaTimeZone: string;
  nowIso?: string;
};

export type VoiceNotificationParseSuccess = {
  title: string;
  notify_at: string;
  subject: string | null;
  chapter: string | null;
  tag: string;
  repeat_type: "once" | "daily" | "weekly";
  groq_model: string;
};

/** Maps to HTTP status in the parse route: validation → 422, config/upstream → 503. */
export type VoiceNotificationParseFailureReason =
  | "validation"
  | "config"
  | "upstream";

const UNCLEAR_TRANSCRIPT =
  "We couldn't understand that clearly. Say what to do and when — for example: \"Remind me to revise Physics tomorrow at 6 pm\".";

function userFacingModelLoopFailure(lastErr: unknown): string {
  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
  if (/^(parse_shape|missing_title|missing_time|bad_time)$/i.test(msg)) {
    return UNCLEAR_TRANSCRIPT;
  }
  return UNCLEAR_TRANSCRIPT;
}

export type VoiceNotificationParseResult =
  | { ok: true; data: VoiceNotificationParseSuccess }
  | {
      ok: false;
      error: string;
      reason: VoiceNotificationParseFailureReason;
    };

export async function runVoiceNotificationParse(
  input: VoiceNotificationParseInput,
): Promise<VoiceNotificationParseResult> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      error: "Voice notifications are not configured on the server.",
      reason: "config",
    };
  }

  const raw = input.transcript.trim().slice(0, MAX_TRANSCRIPT);
  if (!raw) {
    return {
      ok: false,
      error: "Nothing was captured to parse.",
      reason: "validation",
    };
  }

  const tz = input.ianaTimeZone.trim().slice(0, 120) || "UTC";
  const nowAnchor = (input.nowIso?.trim() || new Date().toISOString()).slice(0, 40);

  const system = `You convert a student's spoken notification request into structured JSON.
Return ONLY one JSON object (no markdown, no prose). Shape:
{"title":string,"notify_at":string,"subject":string|null,"chapter":string|null,"tag":string,"repeat":string}

Rules:
- title: short label (what they should do), max ${MAX_TITLE} chars. No quotes inside.
- notify_at: single RFC3339/ISO-8601 instant when the notification should fire (include offset like +05:30 or Z). Absolute time the user asked for.
- subject: optional study subject (e.g. "Physics") or null.
- chapter: optional chapter label or null.
- tag: one of exactly: Revision, Study, Break, Admin, Other. Default Study if unclear.
- repeat: one of exactly: once, daily, weekly. Default once if not recurring.

Time context:
- User IANA timezone: ${tz}
- Reference "now" instant (ISO): ${nowAnchor}

Interpret relative times in the user's timezone. Pick the next reasonable future occurrence after the reference instant.
If you cannot determine a time, use notify_at as an empty string (caller will reject).`;

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
      let title = typeof o.title === "string" ? o.title.trim() : "";
      if (!title && typeof o.notification_title === "string") {
        title = o.notification_title.trim();
      }
      if (title.length > MAX_TITLE) title = title.slice(0, MAX_TITLE);
      if (!title) {
        lastErr = new Error("missing_title");
        continue;
      }

      const timeRaw =
        typeof o.notify_at === "string"
          ? o.notify_at.trim()
          : typeof o.remind_at === "string"
            ? o.remind_at.trim()
            : typeof o.remindAt === "string"
              ? o.remindAt.trim()
              : "";
      if (!timeRaw) {
        lastErr = new Error("missing_time");
        continue;
      }

      const at = new Date(timeRaw);
      if (Number.isNaN(at.getTime())) {
        lastErr = new Error("bad_time");
        continue;
      }

      const nowMs = Date.now();
      if (at.getTime() < nowMs - PAST_SKEW_MS) {
        return {
          ok: false,
          error: "That time is already in the past. Try again with a future time.",
          reason: "validation",
        };
      }
      if (at.getTime() > nowMs + MAX_FUTURE_MS) {
        return {
          ok: false,
          error: "Notification time is too far in the future.",
          reason: "validation",
        };
      }

      let subject: string | null =
        typeof o.subject === "string" && o.subject.trim()
          ? o.subject.trim().slice(0, MAX_SUBJECT)
          : null;

      let chapter: string | null =
        typeof o.chapter === "string" && o.chapter.trim()
          ? o.chapter.trim().slice(0, MAX_CHAPTER)
          : null;

      const tag = normalizeTag(o.tag);
      let repeat_type = normalizeRepeat(o.repeat ?? o.repeat_type);
      if (!REPEATS.has(repeat_type)) repeat_type = "once";

      return {
        ok: true,
        data: {
          title,
          notify_at: at.toISOString(),
          subject,
          chapter,
          tag,
          repeat_type,
          groq_model: groqModelUsed,
        },
      };
    } catch (e) {
      lastErr = e;
      if (isTransientGroqError(e)) {
        console.error("[runVoiceNotificationParse] transient Groq error:", e);
        return {
          ok: false,
          error: "Notification parsing is busy. Try again in a moment.",
          reason: "upstream",
        };
      }
      if (!isWrongModelError(e)) {
        console.error("[runVoiceNotificationParse] Groq error:", e);
        return {
          ok: false,
          error: "Could not parse this notification right now. Try again.",
          reason: "upstream",
        };
      }
    }
  }

  console.error("[runVoiceNotificationParse] model chain exhausted:", lastErr);
  return {
    ok: false,
    error: userFacingModelLoopFailure(lastErr),
    reason: "validation",
  };
}
