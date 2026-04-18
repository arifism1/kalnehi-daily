import { addDays } from "date-fns";
import { fromZonedTime, toDate, toZonedTime } from "date-fns-tz";
import Groq from "groq-sdk";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";

import { getGroqModelCandidates } from "@/lib/groqClient";

const MAX_TRANSCRIPT = 2_000;
const MAX_TITLE = 200;
const MAX_SUBJECT = 200;
const MAX_CHAPTER = 200;
const PAST_SKEW_MS = 120_000;
const MAX_FUTURE_MS = 366 * 24 * 60 * 60 * 1000;
const ROLL_DAYS = 7;

const TAGS = new Set(["Revision", "Study", "Break", "Admin", "Other"]);
const REPEATS = new Set(["once", "daily", "weekly"]);

/** RFC 3339 says offset or Z. Without them, the server (UTC) must not guess—use the user's IANA zone. */
function hasExplicitIsoOffset(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (/Z$/i.test(t)) return true;
  if (/T.*[+-]\d{2}:\d{2}$/.test(t)) return true;
  if (/T.*[+-]\d{4}$/.test(t)) return true;
  return false;
}

/**
 * Parse a model time string to an absolute instant. Naive datetimes are in `ianaTimeZone`.
 * Strings with Z/offset are handled by the standard parser.
 */
function parseNotifyAtInstant(
  timeRaw: string,
  ianaTimeZone: string,
): Date | null {
  const t = timeRaw.trim();
  if (!t) return null;

  if (hasExplicitIsoOffset(t)) {
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = toDate(t, { timeZone: ianaTimeZone });
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * If the time is a little before "now" (e.g. model said "today 4pm" but it's 4:02 and skew),
 * or a full day+ behind, add whole days in the user's zone until the instant is in the future.
 * If that fails, use one hour after `nowMs`.
 */
function ensureReasonableFutureInstant(
  at: Date,
  nowMs: number,
  ianaTimeZone: string,
): Date {
  const minMs = nowMs - PAST_SKEW_MS;
  if (at.getTime() >= minMs && at.getTime() <= nowMs + MAX_FUTURE_MS) {
    return at;
  }

  let d = at;
  for (let n = 0; n < ROLL_DAYS; n++) {
    if (d.getTime() >= minMs && d.getTime() <= nowMs + MAX_FUTURE_MS) {
      return d;
    }
    if (d.getTime() < minMs) {
      const z = toZonedTime(d, ianaTimeZone);
      d = fromZonedTime(addDays(z, 1), ianaTimeZone);
    } else {
      break;
    }
  }
  if (d.getTime() >= minMs && d.getTime() <= nowMs + MAX_FUTURE_MS) {
    return d;
  }
  return new Date(nowMs + 60 * 60 * 1000);
}

/**
 * First balanced `{ ... }` with string/escape awareness (handles `}` inside strings).
 */
function extractBalancedJsonObject(text: string): string | null {
  const objStart = text.indexOf("{");
  if (objStart === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = objStart; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) {
        esc = false;
        continue;
      }
      if (c === "\\") {
        esc = true;
        continue;
      }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return text.slice(objStart, i + 1);
    }
  }
  return null;
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

function pickTimeRaw(o: Record<string, unknown>): string {
  const keys: string[] = [
    "notify_at",
    "remind_at",
    "remindAt",
    "time",
    "when",
    "datetime",
    "date_time",
    "scheduled_at",
    "schedule_at",
    "fire_at",
    "at",
  ];
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function pickTitle(o: Record<string, unknown>): string {
  if (typeof o.title === "string" && o.title.trim()) return o.title.trim();
  for (const k of ["task", "label", "name", "notification_title", "reminder", "message"]) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
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

export async function runVoiceNotificationParse(
  input: VoiceNotificationParseInput,
): Promise<
  { ok: true; data: VoiceNotificationParseSuccess } | { ok: false; error: string }
> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "Voice notifications are not configured on the server." };
  }

  const raw = input.transcript.trim().slice(0, MAX_TRANSCRIPT);
  if (!raw) {
    return { ok: false, error: "Nothing was captured to parse." };
  }

  const tz = input.ianaTimeZone.trim().slice(0, 120) || "UTC";
  const nowRef =
    (input.nowIso?.trim() || new Date().toISOString()).slice(0, 50);
  const nowMsRaw = new Date(input.nowIso?.trim() || Date.now()).getTime();
  const nowMs = Number.isNaN(nowMsRaw) ? Date.now() : nowMsRaw;

  const system = `You are a JSON-only API (no markdown, no code fences, no commentary). Output exactly ONE JSON object and nothing else.

The student is scheduling a short reminder. Use this exact shape and key names:
{"title":"...","notify_at":"...","subject":null or string,"chapter":null or string,"tag":"...","repeat":"..."}

FIELDS
- title: what to do, max ${MAX_TITLE} characters. No double quotes in the value.
- notify_at: a single time for the push. It MUST be ISO-8601 and MUST include a timezone: end with Z or a numeric offset like +05:30. The local clock time (hour/minute) must match what a wall clock would show in timezone: ${tz}.
- subject, chapter: optional, or null.
- tag: exactly one of: Revision, Study, Break, Admin, Other. Default "Study" if not clear.
- repeat: only "once", "daily", or "weekly" (lowercase). Default "once" unless they say every day or every week.

TIME RULES
- Reference "now" for the student is: ${nowRef}. Interpret "today", "tomorrow", "in 1 hour", and local times in ${tz}. Choose the next reasonable future moment at or after that reference.
- Example valid notify_at: "2026-12-20T16:00:00+05:30" (not a time without an offset or timezone).

If you cannot find a time in their words, return a good title and set notify_at to about 1 hour after the reference, with the correct offset for ${tz}.`;

  const user = `The student's IANA time zone: ${tz}
Current instant (for "now/today" math): ${nowRef}

Transcript to parse:
"""
${raw}
"""

Remember: respond with a single JSON object only.`;

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];

  const groq = new Groq({ apiKey });
  let lastErr: unknown;

  for (const model of getGroqModelCandidates("parsing")) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages,
        temperature: 0.1,
        max_tokens: 512,
      });
      const content = messageContentToString(
        completion.choices[0]?.message?.content,
      )
        .replace(/```json\n?/gi, "")
        .replace(/```\n?/g, "")
        .trim();

      let parsed: unknown = tryJsonParse(content);
      if (parsed == null && content) {
        const extracted = extractBalancedJsonObject(content);
        if (extracted) parsed = tryJsonParse(extracted);
      }

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        lastErr = new Error("parse_shape");
        continue;
      }

      const o = parsed as Record<string, unknown>;
      let title = pickTitle(o);
      if (title.length > MAX_TITLE) title = title.slice(0, MAX_TITLE);
      if (!title) {
        lastErr = new Error("missing_title");
        continue;
      }

      let timeRaw = pickTimeRaw(o);
      if (!timeRaw) {
        timeRaw = new Date(nowMs + 60 * 60 * 1000).toISOString();
      }

      let at = parseNotifyAtInstant(timeRaw, tz);
      if (!at) {
        lastErr = new Error("bad_time");
        continue;
      }

      if (at.getTime() > nowMs + MAX_FUTURE_MS) {
        return { ok: false, error: "Notification time is too far in the future." };
      }

      at = ensureReasonableFutureInstant(at, nowMs, tz);

      if (at.getTime() > nowMs + MAX_FUTURE_MS) {
        return { ok: false, error: "Notification time is too far in the future." };
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
          groq_model: model,
        },
      };
    } catch (e) {
      lastErr = e;
      if (isTransientGroqError(e)) {
        return {
          ok: false,
          error:
            e instanceof Error
              ? e.message
              : "Notification parsing is busy. Try again shortly.",
        };
      }
      if (!isWrongModelError(e)) {
        return {
          ok: false,
          error:
            e instanceof Error
              ? e.message
              : "Could not parse this notification right now.",
        };
      }
    }
  }

  const m =
    lastErr instanceof Error
      ? lastErr.message
      : "Could not parse this notification right now.";
  if (m === "parse_shape" || m === "missing_title" || m === "bad_time" || m === "missing_time") {
    return {
      ok: false,
      error:
        "We could not read a clear time and title from that. Try saying a title and a time, for example: “remind me to revise Physics tomorrow at 5 p.m.”",
    };
  }
  return { ok: false, error: m };
}
