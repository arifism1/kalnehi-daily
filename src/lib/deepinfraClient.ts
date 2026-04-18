/**
 * Thin fetch-based wrapper for DeepInfra's OpenAI-compatible chat completions API.
 * No additional npm dependencies — uses native fetch available in Node.js 18+.
 *
 * Base URL: https://api.deepinfra.com/v1/openai
 * Auth:     Authorization: Bearer <DEEPINFRA_API_KEY>
 */

import type { AiChatMessage } from "@/lib/aiChatClient";

const DEEPINFRA_BASE_URL = "https://api.deepinfra.com/v1/openai";

export type DeepInfraChatParams = {
  model: string;
  messages: AiChatMessage[];
  temperature?: number;
  max_tokens?: number;
};

export type OpenAIUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

export type OpenAIChoice = {
  message?: { content?: string | null };
};

export type OpenAICompatibleChatResponse = {
  choices?: OpenAIChoice[];
  usage?: OpenAIUsage;
};

/**
 * POST to DeepInfra's chat/completions endpoint.
 * Throws on non-2xx HTTP status or missing API key.
 */
export async function deepinfraChat(
  params: DeepInfraChatParams,
): Promise<OpenAICompatibleChatResponse> {
  const apiKey = process.env.DEEPINFRA_API_KEY?.trim();
  if (!apiKey) throw new Error("DEEPINFRA_API_KEY is not set");

  const resp = await fetch(`${DEEPINFRA_BASE_URL}/chat/completions`, {
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
    throw new Error(`DeepInfra API error ${resp.status}: ${body.slice(0, 200)}`);
  }

  return resp.json() as Promise<OpenAICompatibleChatResponse>;
}
