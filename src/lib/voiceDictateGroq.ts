import Groq from "groq-sdk";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";

import { GROQ_DEFAULT_PARSING_ID } from "@/lib/groqClient";
import {
  VOICE_DICTATE_REPAIR_SYSTEM_PROMPT,
  VOICE_DICTATE_SYSTEM_PROMPT,
} from "@/lib/voicePrompts";
import { isoToIST_HHMM, normalizeVoiceHHMM } from "@/lib/voiceIst";
import { normalizeVoiceTranscriptForParsing } from "@/lib/voiceTranscriptNormalize";

const MAX_TRANSCRIPT_CHARS = 12_000;

/** One actionable row from the model (IST HH:MM or null). */
export type GroqVoiceTask = {
  name: string;
  start_time?: string | null;
  end_time?: string | null;
};

export type VoiceGroqContext = {
  /** ISO timestamp when the user spoke (client clock). */
  referenceIso: string;
  /** YYYY-MM-DD log date. */
  logDate: string;
};

/** Outcome: structured tasks, no API key/transcript (fallback), or strict mode could not parse JSON (parse_failed). */
export type GroqVoiceFetchResult =
  | { outcome: "structured"; tasks: GroqVoiceTask[]; inputTokens: number; outputTokens: number; model: string }
  | { outcome: "fallback"; inputTokens: number; outputTokens: number; model: string }
  | { outcome: "parse_failed"; inputTokens: number; outputTokens: number; model: string };

export type FetchVoiceGroqOptions = {
  /**
   * When true (Dictate My Day draft flow): never substitute the raw transcript as one task;
   * retry with repair prompt, then return parse_failed so the UI can show raw fallback.
   */
  strictParsedTasks?: boolean;
};

/** Extract first `[...]` or `{...}` from model text (handles prose before/after JSON). */
function extractOutermostJson(text: string): string | null {
  const arrStart = text.indexOf("[");
  const objStart = text.indexOf("{");
  if (arrStart === -1 && objStart === -1) return null;
  if (arrStart !== -1 && (objStart === -1 || arrStart < objStart)) {
    const end = text.lastIndexOf("]");
    if (end > arrStart) return text.slice(arrStart, end + 1);
  }
  if (objStart !== -1) {
    const end = text.lastIndexOf("}");
    if (end > objStart) return text.slice(objStart, end + 1);
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

/**
 * Parse Groq message content into a task array.
 * Accepts: raw array [...], or {"tasks":[...]}, or fenced / noisy text.
 */
function extractTasksArrayFromGroqContent(content: string): unknown[] | null {
  const cleaned = content
    .replace(/```json\n?/gi, "")
    .replace(/```\n?/g, "")
    .trim();

  let parsed: unknown | null = tryJsonParse(cleaned);
  if (parsed == null) {
    const extracted = extractOutermostJson(cleaned);
    if (extracted) parsed = tryJsonParse(extracted);
  }
  if (parsed == null) return null;

  if (Array.isArray(parsed)) {
    return parsed.length > 0 ? parsed : null;
  }

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const o = parsed as Record<string, unknown>;
    if (Array.isArray(o.tasks) && o.tasks.length > 0) {
      return o.tasks;
    }
  }

  return null;
}

function stringifyTaskLabel(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}

function taskNameFromObject(o: Record<string, unknown>): string {
  for (const key of [
    "name",
    "title",
    "activity",
    "task",
    "label",
    "task_name",
    "description",
    "body",
  ] as const) {
    const t = stringifyTaskLabel(o[key]);
    if (t.length > 0) return t;
  }
  return "";
}

function sanitizeTasks(raw: unknown[]): GroqVoiceTask[] {
  const out: GroqVoiceTask[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const name = taskNameFromObject(o);
    if (!name) continue;
    const st = normalizeVoiceHHMM(
      o.start_time === null || o.start_time === undefined
        ? null
        : String(o.start_time),
    );
    const et = normalizeVoiceHHMM(
      o.end_time === null || o.end_time === undefined
        ? null
        : String(o.end_time),
    );
    out.push({
      name,
      start_time: st,
      end_time: et,
    });
  }
  return out;
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
  if (e?.status === 404) return true;
  return /decommission|invalid_model|model_not_found|does not exist|unknown model|not supported model/i.test(
    msg,
  );
}

type GroqChatResult = { content: string; inputTokens: number; outputTokens: number; modelName: string };

async function groqChat(
  apiKey: string,
  messages: ChatCompletionMessageParam[],
  opts: { temperature: number; max_tokens: number },
): Promise<GroqChatResult> {
  const groq = new Groq({ apiKey });
  let lastErr: unknown;
  // Voice parsing is strictly locked to 8B — no 70B failover allowed.
  for (const modelName of [GROQ_DEFAULT_PARSING_ID]) {
    try {
      const completion = await groq.chat.completions.create({
        model: modelName,
        ...opts,
        messages,
      });
      return {
        content: messageContentToString(completion.choices[0]?.message?.content),
        inputTokens: completion.usage?.prompt_tokens ?? 0,
        outputTokens: completion.usage?.completion_tokens ?? 0,
        modelName: completion.model ?? modelName,
      };
    } catch (e) {
      lastErr = e;
      if (isTransientGroqError(e)) throw e;
      if (!isWrongModelError(e)) throw e;
    }
  }
  throw lastErr;
}

/**
 * Transcript first, then NOW_IST — so spoken times are not overridden by "current time".
 */
function buildUserMessage(trimmed: string, ctx: VoiceGroqContext): string {
  const nowIst = isoToIST_HHMM(ctx.referenceIso);
  return `LOG_DATE: ${ctx.logDate}

Transcript:
"""${trimmed}"""

Convert the transcript into tasks. Use 24-hour IST for all times.

NOW_IST: ${nowIst}
Use this exact HH:MM for "now" / "abhi" / duration-from-now when the transcript does not state explicit clock times.

Return ONLY a JSON array, e.g. [{"name":"...","start_time":null,"end_time":null}]. No other keys outside the array.`;
}

/** Groq / OpenAI-compatible APIs may return string or content parts array. */
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

async function callGroqOnce(
  apiKey: string,
  trimmed: string,
  ctx: VoiceGroqContext,
): Promise<GroqChatResult> {
  return groqChat(apiKey, [
    { role: "system", content: VOICE_DICTATE_SYSTEM_PROMPT },
    { role: "user", content: buildUserMessage(trimmed, ctx) },
  ], { temperature: 0.12, max_tokens: 2048 });
}

async function callGroqRepair(
  apiKey: string,
  trimmed: string,
  ctx: VoiceGroqContext,
  failedSnippet: string,
): Promise<GroqChatResult> {
  const nowIst = isoToIST_HHMM(ctx.referenceIso);
  return groqChat(
    apiKey,
    [
      { role: "system", content: VOICE_DICTATE_REPAIR_SYSTEM_PROMPT },
      {
        role: "user",
        content: `NOW_IST: ${nowIst}
LOG_DATE: ${ctx.logDate}

Transcript (multiple tasks, stack implied durations in speech order):
"""${trimmed}"""

Previous broken output (ignore except as a hint): """${failedSnippet.slice(0, 1800)}"""

Return ONLY the JSON array.`,
      },
    ],
    { temperature: 0.08, max_tokens: 2048 },
  );
}

/** Last-resort: shorter prompt when main + repair return unusable JSON. */
async function callGroqMinimal(
  apiKey: string,
  trimmed: string,
  ctx: VoiceGroqContext,
): Promise<GroqChatResult> {
  const nowIst = isoToIST_HHMM(ctx.referenceIso);
  return groqChat(
    apiKey,
    [
      {
        role: "system",
        content: `Return ONLY a JSON array. No markdown, no prose.
Each item: {"name":"short task title","start_time":"HH:MM"|null,"end_time":"HH:MM"|null} using 24-hour IST.
Split chained speech (then, after, durations like "for three hours") into multiple items.
NOW_IST=${nowIst}. If user gives only a duration from "now", start at NOW_IST and add end_time.`,
      },
      {
        role: "user",
        content: `LOG_DATE: ${ctx.logDate}
"""${trimmed}"""`,
      },
    ],
    { temperature: 0.05, max_tokens: 2048 },
  );
}

function singleTaskFromRaw(
  trimmed: string,
  referenceIso: string,
): GroqVoiceTask {
  const now = isoToIST_HHMM(referenceIso);
  return {
    name: trimmed.slice(0, 500) || "Voice note",
    start_time: now,
    end_time: null,
  };
}

function tasksFromModelContent(
  content: string,
  trimmed: string,
  referenceIso: string,
  strict: boolean,
  tokenMeta: { inputTokens: number; outputTokens: number; model: string },
): GroqVoiceFetchResult {
  const rawTasks = extractTasksArrayFromGroqContent(content);
  if (!rawTasks) {
    if (strict) return { outcome: "parse_failed", ...tokenMeta };
    return {
      outcome: "structured",
      tasks: [singleTaskFromRaw(trimmed, referenceIso)],
      ...tokenMeta,
    };
  }
  const tasks = sanitizeTasks(rawTasks);
  if (tasks.length === 0) {
    if (strict) return { outcome: "parse_failed", ...tokenMeta };
    return {
      outcome: "structured",
      tasks: [singleTaskFromRaw(trimmed, referenceIso)],
      ...tokenMeta,
    };
  }
  return { outcome: "structured", tasks, ...tokenMeta };
}

/**
 * Calls Groq. Default (pipeline): on parse failure, one fallback task = raw transcript slice.
 * strictParsedTasks: retry repair; never use raw transcript as the only task name.
 */
export async function fetchVoiceTasksFromGroq(
  transcript: string,
  ctx: VoiceGroqContext,
  options?: FetchVoiceGroqOptions,
): Promise<GroqVoiceFetchResult> {
  const strict = options?.strictParsedTasks === true;
  const apiKey = process.env.GROQ_API_KEY?.trim();

  const zeroTokens = { inputTokens: 0, outputTokens: 0, model: "" };

  if (!apiKey) {
    return { outcome: "fallback", ...zeroTokens };
  }

  const trimmed = normalizeVoiceTranscriptForParsing(
    transcript.trim().slice(0, MAX_TRANSCRIPT_CHARS),
  );
  if (!trimmed) {
    return { outcome: "fallback", ...zeroTokens };
  }

  const attemptParse = (r: GroqChatResult): GroqVoiceFetchResult =>
    tasksFromModelContent(r.content, trimmed, ctx.referenceIso, strict, {
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      model: r.modelName,
    });

  const addTokens = (
    base: GroqVoiceFetchResult,
    extra: GroqChatResult,
  ): GroqVoiceFetchResult => ({
    ...base,
    inputTokens: base.inputTokens + extra.inputTokens,
    outputTokens: base.outputTokens + extra.outputTokens,
    model: base.model || extra.modelName,
  });

  const run = async (): Promise<GroqVoiceFetchResult> => {
    const first = await callGroqOnce(apiKey, trimmed, ctx);
    console.log("Groq raw response:", first.content);

    let result = attemptParse(first);
    if (strict && result.outcome === "parse_failed") {
      try {
        const repaired = await callGroqRepair(apiKey, trimmed, ctx, first.content);
        console.log("Groq repair response:", repaired.content);
        result = addTokens(attemptParse(repaired), first);
      } catch (e) {
        console.log("Groq repair error:", e instanceof Error ? e.message : String(e));
        result = { outcome: "parse_failed", ...{ inputTokens: first.inputTokens, outputTokens: first.outputTokens, model: first.modelName } };
      }
    }
    if (strict && result.outcome === "parse_failed") {
      try {
        const minimal = await callGroqMinimal(apiKey, trimmed, ctx);
        console.log("Groq minimal response:", minimal.content);
        result = addTokens(attemptParse(minimal), { inputTokens: result.inputTokens, outputTokens: result.outputTokens, modelName: result.model, content: "" });
      } catch (e) {
        console.log(
          "Groq minimal error:",
          e instanceof Error ? e.message : String(e),
        );
      }
    }
    return result;
  };

  try {
    return await run();
  } catch (first) {
    if (!isTransientGroqError(first)) {
      if (strict) return { outcome: "parse_failed", ...zeroTokens };
      return {
        outcome: "structured",
        tasks: [singleTaskFromRaw(trimmed, ctx.referenceIso)],
        ...zeroTokens,
      };
    }
    try {
      return await run();
    } catch {
      if (strict) return { outcome: "parse_failed", ...zeroTokens };
      return {
        outcome: "structured",
        tasks: [singleTaskFromRaw(trimmed, ctx.referenceIso)],
        ...zeroTokens,
      };
    }
  }
}

