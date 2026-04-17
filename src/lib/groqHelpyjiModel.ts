import {
  getGroqModelCandidates,
  GROQ_LEGACY_70B_VERSATILE_CHAIN,
} from "@/lib/groqClient";

function dedupeModelIds(ids: string[]): string[] {
  const out: string[] = [];
  for (const id of ids) {
    const t = id.trim();
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

/** Default HelpyJi stack — chat routing candidates (8B + 70B failover), then small-model fallback. */
function defaultHelpyjiModelCandidates(): string[] {
  const env = process.env.HELPYJI_GROQ_MODEL?.trim();
  const chatChain = getGroqModelCandidates("chat");
  const smallFallback = "llama-3.2-3b-preview";
  if (env) {
    return dedupeModelIds([env, ...chatChain, smallFallback]);
  }
  return dedupeModelIds([...chatChain, smallFallback]);
}

/**
 * Resolves Groq model order for HelpyJi. In development, `?model=8b|70b` overrides for A/B testing.
 */
export function resolveHelpyjiGroqModels(request: Request): string[] {
  if (process.env.NODE_ENV === "development") {
    try {
      const q = new URL(request.url).searchParams.get("model")?.trim().toLowerCase();
      if (q === "8b")
        return dedupeModelIds([...getGroqModelCandidates("chat"), "llama-3.2-3b-preview"]);
      if (q === "70b") return [...GROQ_LEGACY_70B_VERSATILE_CHAIN];
    } catch {
      /* ignore */
    }
  }
  return defaultHelpyjiModelCandidates();
}
