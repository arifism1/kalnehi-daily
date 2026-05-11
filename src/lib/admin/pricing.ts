import { getAllAdminConfig } from "@/lib/waitlist/batchEngine";
import { MASTERMIND_DEEPINFRA_MODEL } from "@/lib/groqPrepbrainModel";

export type AdminPricingInr = {
  smartTrialInr: number;
  smartMonthlyInr: number;
  smartSemiAnnualInr: number;
  smartAnnualInr: number;
  /** Per-provider input/output rates (INR per 1M tokens). */
  deepinfraInputInrPerM: number;
  deepinfraOutputInrPerM: number;
  /** Mastermind hard-tier DeepInfra model (`MASTERMIND_DEEPINFRA_MODEL`); defaults to chat DeepInfra rates if unset. */
  deepinfraMistralInputInrPerM: number;
  deepinfraMistralOutputInrPerM: number;
  groqInputInrPerM: number;
  groqOutputInrPerM: number;
};

function num(s: string | undefined, fallback: number): number {
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function loadAdminPricingInr(): Promise<AdminPricingInr> {
  const cfg = await getAllAdminConfig();
  return {
    smartTrialInr: num(cfg.smart_trial_price_inr, 19),
    smartMonthlyInr: num(cfg.smart_plan_monthly_price_inr, 299),
    smartSemiAnnualInr: num(cfg.smart_plan_semi_annual_price_inr, 1499),
    smartAnnualInr: num(cfg.smart_plan_annual_price_inr, 2388),
    deepinfraInputInrPerM: num(cfg.ai_deepinfra_input_inr_per_m, 2.82),
    deepinfraOutputInrPerM: num(cfg.ai_deepinfra_output_inr_per_m, 13.15),
    deepinfraMistralInputInrPerM: num(
      cfg.ai_deepinfra_mistral_input_inr_per_m,
      num(cfg.ai_deepinfra_input_inr_per_m, 2.82),
    ),
    deepinfraMistralOutputInrPerM: num(
      cfg.ai_deepinfra_mistral_output_inr_per_m,
      num(cfg.ai_deepinfra_output_inr_per_m, 13.15),
    ),
    groqInputInrPerM: num(cfg.ai_groq_input_inr_per_m, 4.70),
    groqOutputInrPerM: num(cfg.ai_groq_output_inr_per_m, 7.51),
  };
}

/**
 * Compute INR cost for a single AI call based on per-provider input/output rates.
 * Falls back to treating `totalTokens` as all-input when split is unavailable.
 */
export function computeAiCostInr(
  inputTokens: number,
  outputTokens: number,
  provider: "deepinfra" | "groq" | string,
  config: Pick<AdminPricingInr,
    | "deepinfraInputInrPerM"
    | "deepinfraOutputInrPerM"
    | "groqInputInrPerM"
    | "groqOutputInrPerM"
  >,
): number {
  const isDeepInfra = provider === "deepinfra";
  const inputRate = isDeepInfra ? config.deepinfraInputInrPerM : config.groqInputInrPerM;
  const outputRate = isDeepInfra ? config.deepinfraOutputInrPerM : config.groqOutputInrPerM;
  return (inputTokens / 1_000_000) * inputRate + (outputTokens / 1_000_000) * outputRate;
}

/**
 * Cost for a finalized PrepBrain reservation row: Groq rate, Mastermind Mistral rate, or default DeepInfra rate.
 */
export function computePrepbrainReservationCostInr(
  inputTokens: number,
  outputTokens: number,
  provider: string,
  model: string | null | undefined,
  config: AdminPricingInr,
): number {
  if (provider === "groq") {
    return computeAiCostInr(inputTokens, outputTokens, "groq", config);
  }
  if (provider === "deepinfra" && model === MASTERMIND_DEEPINFRA_MODEL) {
    return (
      (inputTokens / 1_000_000) * config.deepinfraMistralInputInrPerM +
      (outputTokens / 1_000_000) * config.deepinfraMistralOutputInrPerM
    );
  }
  return computeAiCostInr(inputTokens, outputTokens, "deepinfra", config);
}

export function paymentKindToInr(
  kind: string,
  p: AdminPricingInr,
): number {
  switch (kind) {
    case "waitlist_skip":
      return p.smartTrialInr;
    case "annual_plan":
      return p.smartAnnualInr;
    case "six_month_plan":
      return p.smartSemiAnnualInr;
    case "plan_upgrade":
      return p.smartMonthlyInr;
    case "extra_credits":
      return 0;
    default:
      return 0;
  }
}
