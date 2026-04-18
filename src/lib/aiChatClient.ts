/**
 * Unified AI chat client for PrepBrain and HelpyJi.
 *
 * Supports two providers:
 *   - "deepinfra" — OpenAI-compatible endpoint at api.deepinfra.com (primary for chat)
 *   - "groq"      — OpenAI-compatible endpoint at api.groq.com (fallback for chat;
 *                    strict sole provider for voice parsing)
 *
 * Failover: tries each candidate in order; on an unrecoverable error moves to the next.
 * Throws if all candidates fail.
 */

import { deepinfraChat, type OpenAICompatibleChatResponse } from "@/lib/deepinfraClient";

export type AiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ModelCandidate = {
  provider: "groq" | "deepinfra";
  model: string;
};

export type AiChatResult = {
  text: string;
  modelUsed: string;
  /** Model-reported total tokens (prompt + completion). 0 if unavailable. */
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
};

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

async function groqOpenAiChat(params: {
  model: string;
  messages: AiChatMessage[];
  temperature?: number;
  max_tokens?: number;
}): Promise<OpenAICompatibleChatResponse> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) throw new Error("GROQ_API_KEY is not set");

  const resp = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      temperature: params.temperature,
      max_tokens: params.max_tokens,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Groq API error ${resp.status}: ${body.slice(0, 200)}`);
  }

  return resp.json() as Promise<OpenAICompatibleChatResponse>;
}

function extractResult(
  resp: OpenAICompatibleChatResponse,
  model: string,
): AiChatResult {
  const raw = resp.choices?.[0]?.message?.content;
  const text = typeof raw === "string" ? raw.trim() : "";
  const u = resp.usage;
  const promptTokens = u?.prompt_tokens ?? 0;
  const completionTokens = u?.completion_tokens ?? 0;
  const totalTokens = u?.total_tokens ?? promptTokens + completionTokens;
  return { text, modelUsed: model, totalTokens, promptTokens, completionTokens };
}

/**
 * Calls the first candidate; on failure, calls the next; throws if all fail.
 * DeepInfra (primary) → Groq 8B (fallback).
 */
export async function callChatCompletion(
  candidates: ModelCandidate[],
  messages: AiChatMessage[],
  options: { temperature?: number; max_tokens?: number },
): Promise<AiChatResult> {
  if (candidates.length === 0) {
    throw new Error("callChatCompletion: no model candidates provided");
  }

  let lastErr: unknown;

  for (const candidate of candidates) {
    try {
      let resp: OpenAICompatibleChatResponse;

      if (candidate.provider === "deepinfra") {
        resp = await deepinfraChat({
          model: candidate.model,
          messages,
          temperature: options.temperature,
          max_tokens: options.max_tokens,
        });
      } else {
        resp = await groqOpenAiChat({
          model: candidate.model,
          messages,
          temperature: options.temperature,
          max_tokens: options.max_tokens,
        });
      }

      const result = extractResult(resp, candidate.model);
      if (result.text) return result;

      // Empty response from this candidate — treat as soft failure, try next
      lastErr = new Error(`${candidate.provider}/${candidate.model} returned empty content`);
    } catch (e) {
      lastErr = e;
      console.error(
        `[aiChatClient] ${candidate.provider}/${candidate.model} failed:`,
        e instanceof Error ? e.message : e,
      );
    }
  }

  throw lastErr ?? new Error("All AI candidates failed");
}
