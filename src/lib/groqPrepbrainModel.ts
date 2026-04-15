import type { User } from "@supabase/supabase-js";

import { getGroqModel } from "@/lib/groqClient";

export type ResolvePrepbrainGroqModelsInput = {
  request: Request;
  user: User;
};

/**
 * PrepBrain always follows the cheap chat routing model:
 * `GROQ_MODEL_CHAT` env (if set) or default chat model fallback.
 */
export function resolvePrepbrainGroqModels(
  _input: ResolvePrepbrainGroqModelsInput,
): string[] {
  return [getGroqModel("chat")];
}
