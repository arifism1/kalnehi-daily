import { getAllAdminConfig } from "@/lib/waitlist/batchEngine";

export type AdminPricingInr = {
  smartTrialInr: number;
  smartMonthlyInr: number;
  smartAnnualInr: number;
  /** Per-provider input/output rates (INR per 1M tokens). */
  deepinfraInputInrPerM: number;
  deepinfraOutputInrPerM: number;
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
    smartMonthlyInr: num(cfg.smart_plan_monthly_price_inr, 499),
    smartAnnualInr: num(cfg.smart_plan_annual_price_inr, 4788),
    deepinfraInputInrPerM: num(cfg.ai_deepinfra_input_inr_per_m, 2.82),
    deepinfraOutputInrPerM: num(cfg.ai_deepinfra_output_inr_per_m, 13.15),
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

export function paymentKindToInr(
  kind: string,
  p: AdminPricingInr,
): number {
  switch (kind) {
    case "waitlist_skip":
      return p.smartTrialInr;
    case "annual_plan":
      return p.smartAnnualInr;
    case "plan_upgrade":
      return p.smartMonthlyInr;
    case "extra_credits":
      return 0;
    default:
      return 0;
  }
}
