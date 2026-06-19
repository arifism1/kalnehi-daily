/**
 * Ramp / attribution metrics (FIZAKI manager dashboard — the buyer's "money screen").
 *
 * Pure functions over the rep's deals. These are the MEASURED metrics the pitch anchors
 * on (not the predicted readiness score): ramp time and quota attainment, baseline vs
 * current. Works on real CSV-imported or manually-entered deals.
 */
import type { Deal } from "@engine/providers/crm";

export interface RampInput {
  deals: readonly Deal[];
  /** Rep's ramp start (ISO date) — the baseline anchor for "days to ...". */
  repStartDate: string;
  /** Quota for the measured period (same currency as deal amounts). */
  quota: number;
  /** Evaluation date (ISO); defaults to now. */
  asOf?: string;
  /** Attainment % that counts as "fully productive". Default 100. */
  fullProductivityAttainmentPct?: number;
}

export interface RampMetricsResult {
  daysToFirstDeal: number | null;
  daysToFullProductivity: number | null;
  wonAmount: number;
  quota: number;
  attainmentPct: number;
  openPipelineAmount: number;
  wonCount: number;
}

const MS_PER_DAY = 86_400_000;

function diffDays(fromIso: string, toIso: string): number | null {
  const a = Date.parse(fromIso);
  const b = Date.parse(toIso);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / MS_PER_DAY);
}

export function computeRampMetrics(input: RampInput): RampMetricsResult {
  const asOf = input.asOf ?? new Date().toISOString();
  const threshold = input.fullProductivityAttainmentPct ?? 100;

  const won = input.deals
    .filter((d) => d.stage === "won")
    .filter((d) => d.closedAt)
    .toSorted((a, b) => Date.parse(a.closedAt!) - Date.parse(b.closedAt!));

  const wonAmount = won.reduce((s, d) => s + d.amount, 0);
  const openPipelineAmount = input.deals
    .filter((d) => d.stage !== "won" && d.stage !== "lost")
    .reduce((s, d) => s + d.amount, 0);

  const attainmentPct =
    input.quota > 0
      ? Math.round((wonAmount / input.quota) * 1000) / 10
      : 0;

  const daysToFirstDeal = won.length > 0
    ? diffDays(input.repStartDate, won[0]!.closedAt!)
    : null;

  // Walk won deals in close order; first date cumulative attainment hits the threshold.
  let daysToFullProductivity: number | null = null;
  if (input.quota > 0) {
    let cumulative = 0;
    for (const d of won) {
      cumulative += d.amount;
      if ((cumulative / input.quota) * 100 >= threshold) {
        daysToFullProductivity = diffDays(input.repStartDate, d.closedAt!);
        break;
      }
    }
  }

  return {
    daysToFirstDeal,
    daysToFullProductivity,
    wonAmount,
    quota: input.quota,
    attainmentPct,
    openPipelineAmount,
    wonCount: won.length,
  };
}
