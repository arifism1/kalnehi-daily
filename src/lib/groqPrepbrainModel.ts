import type { User } from "@supabase/supabase-js";

import { canAccessFcmBroadcastTools } from "@/lib/fcm/adminGate";
import {
  GROQ_CHAT_8B_INSTANT,
  getGroqModel,
  GROQ_LEGACY_70B_VERSATILE_CHAIN,
} from "@/lib/groqClient";

/** Dev `?model=8b` — fixed small model (same as common default 8B id). */
export const PREPBRAIN_8B_MODEL = GROQ_CHAT_8B_INSTANT;

export type ResolvePrepbrainGroqModelsInput = {
  request: Request;
  user: User;
};

/**
 * Resolves which Groq model ids to try in order for PrepBrain chat.
 *
 * Priority: URL `?model=8b|70b` when `NODE_ENV === "development"` or
 * {@link canAccessFcmBroadcastTools} (same gate as FCM broadcast tools), then
 * `GROQ_MODEL_PREPBRAIN`, then {@link getGroqModel} with task `"chat"`.
 */
export function resolvePrepbrainGroqModels(
  input: ResolvePrepbrainGroqModelsInput,
): string[] {
  const { request, user } = input;
  const allowModelQuery =
    process.env.NODE_ENV === "development" ||
    canAccessFcmBroadcastTools(user);

  if (allowModelQuery) {
    try {
      const q = new URL(request.url).searchParams.get("model")?.trim().toLowerCase();
      if (q === "8b") return [PREPBRAIN_8B_MODEL];
      if (q === "70b") return [...GROQ_LEGACY_70B_VERSATILE_CHAIN];
    } catch {
      /* ignore bad URL */
    }
  }

  const env = process.env.GROQ_MODEL_PREPBRAIN?.trim();
  if (env) return [env];

  return [getGroqModel("chat")];
}
