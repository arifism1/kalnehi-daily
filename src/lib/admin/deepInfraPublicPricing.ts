import { MASTERMIND_DEEPINFRA_MODEL } from "@/lib/groqPrepbrainModel";

// GET /models/{model_name} — slashes URL-encoded.
const modelUrl = (slug: string) =>
  `https://api.deepinfra.com/models/${encodeURIComponent(slug)}`;

type DeepInfraModelInfo = {
  model_name?: string;
  pricing?: {
    type?: string;
    /** US cents per single input token */
    cents_per_input_token?: number;
    cents_per_output_token?: number;
  };
};

export type FetchDeepInfraModelPriceOptions = {
  /**
   * Cached reads (admin usage): pass seconds for `next.revalidate`.
   * Manual sync: pass `false` for `cache: "no-store"`.
   */
  revalidateSeconds?: number | false;
};

/**
 * DeepInfra public model endpoint — token list price in US cents per token.
 * INR/M = cents/token × 10_000 × usdToInr
 */
export async function fetchDeepInfraModelPriceInrPerM(
  modelSlug: string,
  usdToInr: number,
  options?: FetchDeepInfraModelPriceOptions,
): Promise<{ inputInrPerM: number; outputInrPerM: number } | { error: string }> {
  const revalidate = options?.revalidateSeconds;
  const fetchInit: RequestInit & { next?: { revalidate: number } } =
    revalidate === false
      ? { cache: "no-store", headers: { Accept: "application/json" } }
      : {
          headers: { Accept: "application/json" },
          next: { revalidate: revalidate ?? 3600 },
        };

  let modelInfo: DeepInfraModelInfo;
  try {
    const res = await fetch(modelUrl(modelSlug), fetchInit);
    if (!res.ok) {
      return { error: `DeepInfra API returned ${res.status} for model "${modelSlug}"` };
    }
    modelInfo = (await res.json()) as DeepInfraModelInfo;
  } catch (e) {
    return { error: `Network error: ${e instanceof Error ? e.message : String(e)}` };
  }

  const p = modelInfo.pricing;
  if (!p) {
    return { error: `Model "${modelSlug}" returned no pricing data` };
  }

  if (p.type && p.type !== "tokens") {
    return { error: `Model "${modelSlug}" uses non-token pricing (type: ${p.type}) — update manually` };
  }

  const cInput = p.cents_per_input_token;
  const cOutput = p.cents_per_output_token;

  if (typeof cInput !== "number" || typeof cOutput !== "number" || cInput <= 0 || cOutput <= 0) {
    return {
      error: `Could not read token pricing for "${modelSlug}": ${JSON.stringify(p)}`,
    };
  }

  return {
    inputInrPerM: Math.round(cInput * 10_000 * usdToInr * 100) / 100,
    outputInrPerM: Math.round(cOutput * 10_000 * usdToInr * 100) / 100,
  };
}

/** Seconds to cache live Mistral list pricing for admin cost estimates (DeepInfra public API). */
export const MISTRAL_DEEPINFRA_PRICE_REVALIDATE_SEC = 3600;

export type MastermindMistralRateSource = "deepinfra_live" | "admin_config";

export type ResolvedMastermindMistralInrRates = {
  inputInrPerM: number;
  outputInrPerM: number;
  source: MastermindMistralRateSource;
  /** When source is config — DeepInfra fetch failed */
  liveFetchError?: string;
};

/**
 * Mastermind Mistral INR/M rates: prefer DeepInfra public model pricing (cached), else admin_config fallbacks.
 */
export async function resolveMastermindMistralInrRates(
  usdToInr: number,
  configFallback: { inputInrPerM: number; outputInrPerM: number },
): Promise<ResolvedMastermindMistralInrRates> {
  const result = await fetchDeepInfraModelPriceInrPerM(MASTERMIND_DEEPINFRA_MODEL, usdToInr, {
    revalidateSeconds: MISTRAL_DEEPINFRA_PRICE_REVALIDATE_SEC,
  });
  if ("error" in result) {
    return {
      inputInrPerM: configFallback.inputInrPerM,
      outputInrPerM: configFallback.outputInrPerM,
      source: "admin_config",
      liveFetchError: result.error,
    };
  }
  return {
    inputInrPerM: result.inputInrPerM,
    outputInrPerM: result.outputInrPerM,
    source: "deepinfra_live",
  };
}
