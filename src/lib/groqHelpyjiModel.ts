import {
  GROQ_CHAT_8B_INSTANT,
  getGroqModel,
  GROQ_LEGACY_70B_VERSATILE_CHAIN,
} from "@/lib/groqClient";

/** Default HelpyJi stack — primary follows chat routing, then small-model fallback. */
function defaultHelpyjiModelCandidates(): string[] {
  const env = process.env.HELPYJI_GROQ_MODEL?.trim();
  const d = getGroqModel("chat");
  const smallFallback = "llama-3.2-3b-preview";
  if (env) {
    const tail = [d, smallFallback].filter((id) => id !== env);
    return [env, ...tail];
  }
  return [d, smallFallback];
}

/**
 * Resolves Groq model order for HelpyJi. In development, `?model=8b|70b` overrides for A/B testing.
 */
export function resolveHelpyjiGroqModels(request: Request): string[] {
  if (process.env.NODE_ENV === "development") {
    try {
      const q = new URL(request.url).searchParams.get("model")?.trim().toLowerCase();
      if (q === "8b")
        return [GROQ_CHAT_8B_INSTANT, "llama-3.2-3b-preview"];
      if (q === "70b") return [...GROQ_LEGACY_70B_VERSATILE_CHAIN];
    } catch {
      /* ignore */
    }
  }
  return defaultHelpyjiModelCandidates();
}
