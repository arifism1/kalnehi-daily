/**
 * ENGINE provider interface: LLM (PROVIDER_LLM).
 *
 * Domain-agnostic. The engine and verticals depend ONLY on this interface; concrete
 * adapters (Groq + DeepInfra failover via src/lib/aiChatClient.ts) live OUTSIDE the
 * engine in src/lib/providers/ so providers can be swapped without touching engine logic.
 *
 * This file must not import app code (enforced by the engine ESLint boundary).
 */

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmChatOptions {
  temperature?: number;
  maxTokens?: number;
  /** Abort signal for request cancellation. */
  signal?: AbortSignal;
}

export interface LlmChatResult {
  text: string;
  /** Provider/model that actually served the response (after any failover). */
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
}

export interface LlmProvider {
  /** Non-streaming completion. */
  chat(messages: LlmMessage[], options?: LlmChatOptions): Promise<LlmChatResult>;
  /** Streaming completion as an async iterable of text deltas. */
  stream(
    messages: LlmMessage[],
    options?: LlmChatOptions,
  ): AsyncIterable<string>;
}
