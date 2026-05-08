import type { User } from "@supabase/supabase-js";

import { type ModelCandidate } from "@/lib/aiChatClient";
import { type MastermindModelTier } from "@/lib/mastermindModelTier";
import { GROQ_DEFAULT_CHAT_ID } from "@/lib/groqClient";

/** Fixed DeepInfra model for Mastermind (`/api/prepbrain/chat` hard tier); not overridden by DEEPINFRA_CHAT_MODEL. */
export const MASTERMIND_DEEPINFRA_MODEL =
  "mistralai/Mistral-Small-24B-Instruct-2501" as const;

export type ResolvePrepbrainGroqModelsInput = {
  request: Request;
  user: User;
};

/**
 * Mastermind Chat routing: Groq-only for cheap turns; Mistral-first when tier is hard.
 */
export function mastermindModelsForTier(tier: MastermindModelTier): ModelCandidate[] {
  if (tier === "easy") {
    return [{ provider: "groq", model: GROQ_DEFAULT_CHAT_ID }];
  }
  return [
    { provider: "deepinfra", model: MASTERMIND_DEEPINFRA_MODEL },
    { provider: "groq", model: GROQ_DEFAULT_CHAT_ID },
  ];
}

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
