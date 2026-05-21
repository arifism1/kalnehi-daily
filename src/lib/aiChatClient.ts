/**
 * Unified AI chat client for PrepBrain.
 *
 * Supports two providers:
 *   - "deepinfra" — OpenAI-compatible endpoint at api.deepinfra.com (primary for chat)
 *   - "groq"      — OpenAI-compatible endpoint at api.groq.com (fallback for chat;
 *                    strict sole provider for voice parsing)
 *
 * Failover: tries each candidate in order; on an unrecoverable error moves to the next.
 * Throws if all candidates fail.
 */

import {
  deepinfraChat,
  deepinfraChatStreamRequest,
  type OpenAICompatibleChatResponse,
} from "@/lib/deepinfraClient";

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
  providerUsed: "deepinfra" | "groq";
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
  provider: "deepinfra" | "groq",
): AiChatResult {
  const raw = resp.choices?.[0]?.message?.content;
  const text = typeof raw === "string" ? raw.trim() : "";
  const u = resp.usage;
  const promptTokens = u?.prompt_tokens ?? 0;
  const completionTokens = u?.completion_tokens ?? 0;
  const totalTokens = u?.total_tokens ?? promptTokens + completionTokens;
  return { text, modelUsed: model, providerUsed: provider, totalTokens, promptTokens, completionTokens };
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
        // react-doctor-disable-next-line react-doctor/async-await-in-loop -- sequential fallback: try next provider only if this one fails
        resp = await deepinfraChat({
          model: candidate.model,
          messages,
          temperature: options.temperature,
          max_tokens: options.max_tokens,
        });
      } else {
        // react-doctor-disable-next-line react-doctor/async-await-in-loop -- sequential fallback: try next provider only if this one fails
        resp = await groqOpenAiChat({
          model: candidate.model,
          messages,
          temperature: options.temperature,
          max_tokens: options.max_tokens,
        });
      }

      const result = extractResult(resp, candidate.model, candidate.provider);
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

export type StreamingChatUsage = {
  fullText: string;
  modelUsed: string;
  providerUsed: "deepinfra" | "groq";
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
};

export type StreamingChatResult = {
  /** Emits one string chunk per model delta (may be a single character or a phrase). */
  textStream: ReadableStream<string>;
  /** Resolves when the provider stream ends (success or end of body). */
  usagePromise: Promise<StreamingChatUsage>;
};

type OpenAiStreamLineJson = {
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  choices?: { delta?: { content?: string | null; role?: string } }[];
};

/**
 * Converts an OpenAI-compatible SSE `chat/completions` body into text deltas
 * and resolves usage from the last chunk that includes `usage` (or zeros).
 */
function openAiSseToTextStream(
  body: ReadableStream<Uint8Array>,
  defaultModel: string,
  provider: "deepinfra" | "groq",
): { textStream: ReadableStream<string>; usagePromise: Promise<StreamingChatUsage> } {
  let resolveUsage!: (v: StreamingChatUsage) => void;
  const usagePromise = new Promise<StreamingChatUsage>((r) => {
    resolveUsage = r;
  });

  const textStream = new ReadableStream<string>({
    async start(controller) {
      const reader = body.getReader();
      const dec = new TextDecoder();
      let lineBuf = "";
      let acc = "";
      let modelUsed = defaultModel;
      let promptTokens = 0;
      let completionTokens = 0;
      let totalTokens = 0;

      const flushLine = (line: string) => {
        const t = line.trim();
        if (!t.startsWith("data: ")) return;
        const data = t.slice(6);
        if (data === "[DONE]") {
          return;
        }
        try {
          const json = JSON.parse(data) as OpenAiStreamLineJson;
          if (typeof json.model === "string" && json.model) modelUsed = json.model;
          if (json.usage) {
            promptTokens = json.usage.prompt_tokens ?? promptTokens;
            completionTokens = json.usage.completion_tokens ?? completionTokens;
            totalTokens = json.usage.total_tokens ?? totalTokens;
          }
          const d = json.choices?.[0]?.delta?.content;
          if (typeof d === "string" && d.length > 0) {
            acc += d;
            controller.enqueue(d);
          }
        } catch {
          /* ignore partial JSON from chunk boundaries */
        }
      };

      try {
        while (true) {
          // react-doctor-disable-next-line react-doctor/async-await-in-loop -- streaming read loop: each chunk depends on the previous
          const { value, done } = await reader.read();
          if (done) break;
          lineBuf += dec.decode(value, { stream: true });
          const lines = lineBuf.split("\n");
          lineBuf = lines.pop() ?? "";
          for (const line of lines) flushLine(line);
        }
        if (lineBuf.length > 0) {
          for (const part of lineBuf.split("\n")) flushLine(part);
        }
        if (!totalTokens) {
          const pc = promptTokens + completionTokens;
          totalTokens = pc > 0 ? pc : 0;
        }
        resolveUsage({
          fullText: acc,
          modelUsed,
          providerUsed: provider,
          totalTokens,
          promptTokens,
          completionTokens,
        });
        controller.close();
      } catch (e) {
        resolveUsage({
          fullText: acc,
          modelUsed,
          providerUsed: provider,
          totalTokens: 0,
          promptTokens: 0,
          completionTokens: 0,
        });
        controller.error(e);
      }
    },
  });

  return { textStream, usagePromise };
}

async function groqOpenAiChatStream(params: {
  model: string;
  messages: AiChatMessage[];
  temperature?: number;
  max_tokens?: number;
}): Promise<Response> {
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
      stream: true,
      stream_options: { include_usage: true },
    }),
  });

  if (!resp.ok) {
    const b = await resp.text().catch(() => "");
    throw new Error(`Groq API error ${resp.status}: ${b.slice(0, 200)}`);
  }
  if (!resp.body) throw new Error("Groq streaming response has no body");
  return resp;
}

/**
 * Same failover order as `callChatCompletion`, but returns an SSE text stream
 * and a promise of final usage from the first successful candidate.
 */
export async function callStreamingChatCompletion(
  candidates: ModelCandidate[],
  messages: AiChatMessage[],
  options: { temperature?: number; max_tokens?: number },
): Promise<StreamingChatResult> {
  if (candidates.length === 0) {
    throw new Error("callStreamingChatCompletion: no model candidates provided");
  }

  let lastErr: unknown;

  for (const candidate of candidates) {
    try {
      const resp =
        candidate.provider === "deepinfra"
          ? // react-doctor-disable-next-line react-doctor/async-await-in-loop -- sequential fallback: try next provider only if this one fails
            await deepinfraChatStreamRequest({
              model: candidate.model,
              messages,
              temperature: options.temperature,
              max_tokens: options.max_tokens,
            })
          : await groqOpenAiChatStream({
              model: candidate.model,
              messages,
              temperature: options.temperature,
              max_tokens: options.max_tokens,
            });

      const { textStream, usagePromise } = openAiSseToTextStream(
        resp.body!,
        candidate.model,
        candidate.provider,
      );
      // Note: we cannot try the next candidate on empty text — the body is already consumed.
      return {
        textStream,
        usagePromise: usagePromise.then((u) => ({
          ...u,
          modelUsed: candidate.model,
          providerUsed: candidate.provider,
        })),
      };
    } catch (e) {
      lastErr = e;
      console.error(
        `[aiChatClient] stream ${candidate.provider}/${candidate.model} failed:`,
        e instanceof Error ? e.message : e,
      );
    }
  }

  throw lastErr ?? new Error("All AI streaming candidates failed");
}
