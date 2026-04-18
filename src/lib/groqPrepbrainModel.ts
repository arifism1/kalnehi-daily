import type { User } from "@supabase/supabase-js";

import { GROQ_DEFAULT_CHAT_ID } from "@/lib/groqClient";
import { type ModelCandidate } from "@/lib/aiChatClient";

export type ResolvePrepbrainGroqModelsInput = {
  request: Request;
  user: User;
};

/**
 * PrepBrain model routing:
 *   1. DeepInfra (DEEPINFRA_CHAT_MODEL env var) — primary, if configured.
 *   2. Groq llama-3.1-8b-instant — always present as the fallback.
 *
 * If DEEPINFRA_CHAT_MODEL is unset the list collapses to Groq 8B only.
 * callChatCompletion() tries candidates in order and stops at the first success.
 */
export function resolvePrepbrainGroqModels(
  _input: ResolvePrepbrainGroqModelsInput,
): ModelCandidate[] {
  const candidates: ModelCandidate[] = [];

  const diModel = process.env.DEEPINFRA_CHAT_MODEL?.trim();
  if (diModel) {
    candidates.push({ provider: "deepinfra", model: diModel });
  }

  // Groq 8B is always the last-resort fallback (or sole model if DeepInfra is unconfigured).
  candidates.push({ provider: "groq", model: GROQ_DEFAULT_CHAT_ID });

  return candidates;
}
