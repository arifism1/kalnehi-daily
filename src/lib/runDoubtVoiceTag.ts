import Groq from "groq-sdk";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";

import { resolveSubjectAgainstCatalog } from "@/lib/doubtSubjects";
import { resolveTopicLineAgainstCatalog } from "@/lib/doubtVoiceTagSyllabus";
import { getGroqModelCandidates } from "@/lib/groqClient";

const MAX_TRANSCRIPT = 12_000;
const MAX_DOUBT_TEXT = 600;

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
          return String((part as { text?: string }).text ?? "");
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
  if (e?.status === 404) return true;
  return /decommission|invalid_model|model_not_found|does not exist|unknown model|not supported model/i.test(
    msg,
  );
}

export type DoubtVoiceTagGroqInput = {
  transcript: string;
  allowedSubjects: string[];
  topicLinesForPrompt: string[];
  /** Small JSON-serializable object (trimmed PrepBrain context). */
  prepbrainContextTrim?: unknown;
};

export type DoubtVoiceTagGroqSuccess = {
  doubt_text: string;
  subject: string | null;
  topic: string | null;
  groq_model: string;
};

/**
 * Calls Groq with the **parsing** model chain (default `llama-3.1-8b-instant`).
 * Validates subject/topic against allowed sets.
 */
export async function runDoubtVoiceTagGroq(
  input: DoubtVoiceTagGroqInput,
  validSubjects: Set<string>,
  validTopicLines: Set<string>,
): Promise<
  | { ok: true; data: DoubtVoiceTagGroqSuccess }
  | { ok: false; error: string }
> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "Voice tagging is not configured on the server." };
  }

  const raw = input.transcript.trim().slice(0, MAX_TRANSCRIPT);
  if (!raw) {
    return { ok: false, error: "Nothing was captured to tag." };
  }

  const subjectList = [...input.allowedSubjects].sort((a, b) =>
    a.localeCompare(b),
  );
  const topicSlice = input.topicLinesForPrompt.slice(0, 400);

  let prepJson = "";
  if (input.prepbrainContextTrim != null) {
    try {
      prepJson = JSON.stringify(input.prepbrainContextTrim).slice(0, 6_000);
    } catch {
      prepJson = "";
    }
  }

  const system = `You map a student's spoken exam doubt to structured fields.
Return ONLY a single JSON object (no markdown fences, no prose). Shape:
{"doubt_text":string,"subject":string|null,"topic":string|null}

Rules:
- doubt_text: rewrite the transcript as one clear doubt in English (or keep Hindi terms in Latin script if needed). Max ${MAX_DOUBT_TEXT} characters.
- subject: When the doubt clearly maps to one syllabus area (keywords, typical exam phrasing), set subject to the **best-matching string copied exactly** from ALLOWED_SUBJECTS. Use null only when the doubt is truly cross-cutting or none of the list entries fit.
- topic: When confident, set topic to one string **copied exactly** from ALLOWED_TOPIC_LINES (chapter — microtopic, em dash U+2014 between parts). If you are unsure of the exact line text, use null — do not invent new lines.

ALLOWED_SUBJECTS (JSON array — subject must be null or one of these strings verbatim):
${JSON.stringify(subjectList)}

ALLOWED_TOPIC_LINES (each line is one valid value for topic):
${topicSlice.map((l) => `- ${l}`).join("\n")}`;

  const userParts: string[] = [`Transcript:\n"""${raw}"""`];
  if (prepJson) {
    userParts.push(
      `Optional prep context (JSON — use only to bias subject/topic toward weak areas when the transcript is ambiguous):\n${prepJson}`,
    );
  }

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    { role: "user", content: userParts.join("\n\n") },
  ];

  const groq = new Groq({ apiKey });
  let lastErr: unknown;
  let groqModelUsed = "";

  for (const model of getGroqModelCandidates("parsing")) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages,
        temperature: 0.12,
        max_tokens: 512,
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
      let doubtText =
        typeof o.doubt_text === "string"
          ? o.doubt_text.trim()
          : typeof o.doubtText === "string"
            ? o.doubtText.trim()
            : raw;

      if (doubtText.length > MAX_DOUBT_TEXT) {
        doubtText = doubtText.slice(0, MAX_DOUBT_TEXT);
      }
      if (!doubtText) doubtText = raw.slice(0, MAX_DOUBT_TEXT);

      const rawSubject =
        typeof o.subject === "string" && o.subject.trim()
          ? o.subject.trim()
          : "";
      const subjectCanon = rawSubject
        ? resolveSubjectAgainstCatalog(rawSubject, subjectList)
        : "";
      const subject =
        subjectCanon && validSubjects.has(subjectCanon) ? subjectCanon : null;

      const rawTopic =
        typeof o.topic === "string" && o.topic.trim() ? o.topic.trim() : "";
      const topic = rawTopic
        ? resolveTopicLineAgainstCatalog(rawTopic, validTopicLines)
        : null;

      return {
        ok: true,
        data: {
          doubt_text: doubtText,
          subject,
          topic,
          groq_model: groqModelUsed,
        },
      };
    } catch (e) {
      lastErr = e;
      if (isTransientGroqError(e)) {
        return {
          ok: false,
          error:
            e instanceof Error ? e.message : "Voice tagging service is busy.",
        };
      }
      if (!isWrongModelError(e)) {
        return {
          ok: false,
          error:
            e instanceof Error ? e.message : "Could not tag this doubt right now.",
        };
      }
    }
  }

  return {
    ok: false,
    error:
      lastErr instanceof Error
        ? lastErr.message
        : "Could not tag this doubt right now.",
  };
}
