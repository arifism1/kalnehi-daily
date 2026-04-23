"use server";

import { revalidatePath } from "next/cache";

import { getAllAdminConfig, setAdminConfig } from "@/lib/waitlist/batchEngine";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/waitlist/batchEngine";

// Endpoint: GET /models/{model_name} — model_name may contain slashes, must be URL-encoded.
const DEEPINFRA_MODEL_URL = (slug: string) =>
  `https://api.deepinfra.com/models/${encodeURIComponent(slug)}`;

type DeepInfraModelInfo = {
  model_name?: string;
  pricing?: {
    type?: string;
    /** US cents per single input token (e.g. 0.000002 = $0.02/M tokens). */
    cents_per_input_token?: number;
    /** US cents per single output token. */
    cents_per_output_token?: number;
  };
};

/**
 * Fetches a specific model's pricing from DeepInfra.
 *
 * DeepInfra pricing unit: `cents_per_input_token` = US cents per ONE token.
 * Conversion to INR/M tokens:
 *   inrPerM = cents_per_token × 1_000_000 tokens × (1 USD / 100 cents) × usdToInr
 *           = cents_per_token × 10_000 × usdToInr
 */
async function fetchDeepInfraPriceInrPerM(
  modelSlug: string,
  usdToInr: number,
): Promise<{ inputInrPerM: number; outputInrPerM: number } | { error: string }> {
  let modelInfo: DeepInfraModelInfo;
  try {
    const res = await fetch(DEEPINFRA_MODEL_URL(modelSlug), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
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

  // cents/token × 10_000 = INR/M tokens (at given usdToInr rate)
  return {
    inputInrPerM: Math.round(cInput * 10_000 * usdToInr * 100) / 100,
    outputInrPerM: Math.round(cOutput * 10_000 * usdToInr * 100) / 100,
  };
}

export type SyncDeepInfraResult =
  | { ok: true; inputInrPerM: number; outputInrPerM: number; modelSlug: string }
  | { ok: false; error: string };

export async function syncDeepInfraPricing(): Promise<SyncDeepInfraResult> {
  // Auth guard — server action must only run for admin users
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const isAdmin = await isAdminUser(user.id, user.email);
  if (!isAdmin) return { ok: false, error: "Admin access required." };

  const modelSlug = process.env.DEEPINFRA_CHAT_MODEL?.trim();
  if (!modelSlug) {
    return { ok: false, error: "DEEPINFRA_CHAT_MODEL env var is not set." };
  }

  const cfg = await getAllAdminConfig();
  const usdToInr = parseFloat(cfg.ai_usd_to_inr_rate ?? "95");
  const usdToInrRate = Number.isFinite(usdToInr) && usdToInr > 0 ? usdToInr : 95;

  const result = await fetchDeepInfraPriceInrPerM(modelSlug, usdToInrRate);
  if ("error" in result) return { ok: false, error: result.error };

  const { inputInrPerM, outputInrPerM } = result;

  await Promise.all([
    setAdminConfig("ai_deepinfra_input_inr_per_m", String(inputInrPerM), user.id),
    setAdminConfig("ai_deepinfra_output_inr_per_m", String(outputInrPerM), user.id),
  ]);

  revalidatePath("/admin/config");

  return { ok: true, inputInrPerM, outputInrPerM, modelSlug };
}
