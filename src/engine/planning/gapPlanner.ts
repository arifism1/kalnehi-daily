/**
 * ENGINE primitive: GapPlanner + OutcomeMetric projection (domain-agnostic).
 *
 * This is the generic "max payoff per effort" math that powers Kalnehi's Target Score
 * Blueprint AND FIZAKI's Quota-Gap Planner. It knows nothing about exams, marks, syllabi,
 * quotas or sales — it operates on neutral "branches" with a `weight` (outcome contribution)
 * and a `progressPercent` (0..100 mastery). Verticals supply accessors over their own shapes.
 *
 * PARITY: these functions are the single source of truth for the math previously inlined in
 * src/lib/targetScoreBlueprint.ts. That module now delegates here; the golden-master snapshot
 * guards against any drift.
 */

export interface OutcomeBranchLike {
  weight: number;
  progressPercent: number;
}

export interface OutcomeProjection {
  /** Σ weight × progress% / 100. */
  weightedPool: number;
  /** Mapped to the outcome scale: weightedPool / totalPool × maxScore (capped). */
  projected: number;
}

export interface OutcomeTargetRange {
  clampedTarget: number;
  low: number;
  high: number;
}

export type GapThresholdMode = "absolute" | "gain";

export interface PickUntilThresholdResult<T> {
  selected: T[];
  totalWeightCovered: number;
  thresholdExceedsFullPool: boolean;
}

/**
 * Current trajectory on the outcome scale. `totalPool` defaults to Σ weight but can be
 * supplied when the caller already tracks a canonical pool (preserves exact rounding).
 */
export function projectOutcomeLinear(
  branches: readonly OutcomeBranchLike[],
  maxScore: number,
  totalPool?: number,
): OutcomeProjection {
  const pool =
    totalPool ?? branches.reduce((s, b) => s + b.weight, 0);
  if (pool <= 0 || maxScore <= 0) {
    return { weightedPool: 0, projected: 0 };
  }
  let weightedPool = 0;
  for (const b of branches) {
    weightedPool += b.weight * (b.progressPercent / 100);
  }
  const projected = Math.min(
    maxScore,
    Math.round((weightedPool / pool) * maxScore),
  );
  return { weightedPool, projected };
}

export function outcomeTargetRange(
  rawTarget: number,
  maxScore: number,
): OutcomeTargetRange {
  const cap = Math.max(0, maxScore);
  const clampedTarget = Math.min(
    cap,
    Math.max(0, Math.round(Number.isFinite(rawTarget) ? rawTarget : 0)),
  );
  const margin = Math.max(15, Math.round(cap * 0.02));
  let low = clampedTarget - margin;
  let high = clampedTarget + margin;
  low = Math.max(0, low);
  high = Math.min(cap, high);
  if (low > high) low = high;
  return { clampedTarget, low, high };
}

/** Highest payoff first: greater weight first, ties broken by lower progress (more room). */
export function sortByPayoff<T>(
  items: readonly T[],
  weightOf: (t: T) => number,
  progressOf: (t: T) => number,
): T[] {
  return [...items].toSorted((a, b) => {
    const w = weightOf(b) - weightOf(a);
    if (w !== 0) return w;
    return progressOf(a) - progressOf(b);
  });
}

/** Greedily select branches (already sorted) until their weight covers the threshold. */
export function pickUntilThreshold<T>(
  sorted: readonly T[],
  thresholdWeight: number,
  weightOf: (t: T) => number,
): PickUntilThresholdResult<T> {
  const totalPool = sorted.reduce((s, c) => s + weightOf(c), 0);
  if (thresholdWeight <= 0 || totalPool <= 0) {
    return { selected: [], totalWeightCovered: 0, thresholdExceedsFullPool: false };
  }
  const thresholdExceedsFullPool = thresholdWeight > totalPool;
  if (thresholdExceedsFullPool) {
    return {
      selected: [...sorted],
      totalWeightCovered: totalPool,
      thresholdExceedsFullPool: true,
    };
  }
  const selected: T[] = [];
  let sum = 0;
  for (const c of sorted) {
    selected.push(c);
    sum += weightOf(c);
    if (sum >= thresholdWeight) break;
  }
  return { selected, totalWeightCovered: sum, thresholdExceedsFullPool: false };
}

/**
 * Weight share per group, in first-seen order. Verticals apply their own group ordering
 * (e.g. Kalnehi's PCB subject order) AFTER calling this — ordering is a vertical concern.
 */
export function groupSplitWeights<T>(
  items: readonly T[],
  groupOf: (t: T) => string,
  weightOf: (t: T) => number,
): { group: string; percent: number }[] {
  const total = items.reduce((s, c) => s + weightOf(c), 0);
  if (total <= 0) return [];
  const byGroup = new Map<string, number>();
  for (const c of items) {
    const g = groupOf(c) || "Other";
    byGroup.set(g, (byGroup.get(g) ?? 0) + weightOf(c));
  }
  const rows: { group: string; percent: number }[] = [];
  for (const [group, w] of byGroup) {
    rows.push({ group, percent: Math.round((w / total) * 1000) / 10 });
  }
  return rows;
}

export function gapThresholdForMode(
  mode: GapThresholdMode,
  range: OutcomeTargetRange,
  currentProjected: number,
): number {
  if (mode === "absolute") return range.low;
  const current = Math.round(currentProjected);
  return Math.max(0, range.low - current);
}
