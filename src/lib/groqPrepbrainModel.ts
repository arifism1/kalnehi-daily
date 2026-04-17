import type { User } from "@supabase/supabase-js";

import { getGroqModelCandidates } from "@/lib/groqClient";

export type ResolvePrepbrainGroqModelsInput = {
  request: Request;
  user: User;
};

/**
 * PrepBrain follows chat routing (`GROQ_MODEL_CHAT` or default 8B), with the same
 * legacy 70B failover chain as {@link getGroqModelCandidates}("chat").
 */
export function resolvePrepbrainGroqModels(
  _input: ResolvePrepbrainGroqModelsInput,
): string[] {
  return getGroqModelCandidates("chat");
}
