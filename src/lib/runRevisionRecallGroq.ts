import Groq from "groq-sdk";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";

import { getGroqModelCandidates } from "@/lib/groqClient";

const MAX_TRANSCRIPT = 12_000;
const MAX_FEEDBACK = 1200;

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

export type RevisionRecallGroqInput = {
  topicTitle: string;
  subject?: string | null;
  chapter?: string | null;
  transcript: string;
};

export type RevisionRecallGroqSuccess = {
  quality_score: number;
  feedback: string;
  suggested_focus: string;
  groq_model: string;
  groq_feedback: {
    quality_score: number;
    feedback: string;
    suggested_focus: string;
  };
};

/**
 * Groq 8B (parsing model chain) scores active recall against the topic label.
 */
export async function runRevisionRecallGroq(
  input: RevisionRecallGroqInput,
): Promise<
  { ok: true; data: RevisionRecallGroqSuccess } | { ok: false; error: string }
> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "Recall feedback is not configured on the server." };
  }

  const raw = input.transcript.trim().slice(0, MAX_TRANSCRIPT);
  if (!raw) {
    return { ok: false, error: "Nothing to evaluate." };
  }

  const title = input.topicTitle.trim() || "Topic";
  const subj = (input.subject ?? "").trim();
  const ch = (input.chapter ?? "").trim();
  const ctx = [subj && `Subject: ${subj}`, ch && `Chapter: ${ch}`]
    .filter(Boolean)
    .join("\n");

  const system = `You are an exam coach (JEE/NEET/UPSC style). A student is doing active recall: they speak or type everything they remember about a microtopic.

Return ONLY a single JSON object (no markdown fences, no extra text). Shape:
{"quality_score": number, "feedback": string, "suggested_focus": string}

Rules:
- quality_score: integer 1-5. Be strict but fair. 5 = strong coverage, correct framing, key edge cases. 1 = mostly missing or wrong.
- feedback: 2-4 short sentences, supportive tone, what was strong and what to tighten. Max ${MAX_FEEDBACK} characters.
- suggested_focus: one line (max 200 chars) naming the best next thing to restudy for this microtopic.`;

  const userContent = [
    `Microtopic label: ${title}`,
    ctx || null,
    `Student recall (verbatim):\n"""${raw}"""`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    { role: "user", content: userContent },
  ];

  const groq = new Groq({ apiKey });
  let lastErr: unknown;
  let groqModelUsed = "";

  for (const model of getGroqModelCandidates("parsing")) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages,
        temperature: 0.2,
        max_tokens: 600,
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
      const rawScore = o.quality_score ?? o.qualityScore;
      let quality_score = 3;
      if (typeof rawScore === "number" && Number.isFinite(rawScore)) {
        quality_score = Math.min(5, Math.max(1, Math.round(rawScore)));
      } else if (typeof rawScore === "string" && /^\d+$/.test(rawScore)) {
        quality_score = Math.min(5, Math.max(1, Math.round(Number(rawScore))));
      }

      let feedback =
        typeof o.feedback === "string" ? o.feedback.trim() : "Keep practicing this topic.";
      if (feedback.length > MAX_FEEDBACK) {
        feedback = feedback.slice(0, MAX_FEEDBACK);
      }

      let suggested_focus =
        typeof o.suggested_focus === "string"
          ? o.suggested_focus.trim()
          : typeof o.suggestedFocus === "string"
            ? o.suggestedFocus.trim()
            : "Re-read key definitions and one representative problem.";

      if (suggested_focus.length > 200) {
        suggested_focus = suggested_focus.slice(0, 200);
      }

      const payload = { quality_score, feedback, suggested_focus };
      return {
        ok: true,
        data: {
          quality_score,
          feedback,
          suggested_focus,
          groq_model: groqModelUsed,
          groq_feedback: payload,
        },
      };
    } catch (e) {
      lastErr = e;
      if (isTransientGroqError(e)) {
        return {
          ok: false,
          error:
            e instanceof Error ? e.message : "Recall feedback service is busy.",
        };
      }
      if (!isWrongModelError(e)) {
        return {
          ok: false,
          error:
            e instanceof Error
              ? e.message
              : "Could not evaluate recall right now.",
        };
      }
    }
  }

  return {
    ok: false,
    error:
      lastErr instanceof Error
        ? lastErr.message
        : "Could not evaluate recall right now.",
  };
}
