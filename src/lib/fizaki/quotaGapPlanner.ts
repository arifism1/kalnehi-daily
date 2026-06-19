/**
 * Quota-Gap Planner (FIZAKI) — a reskin of the engine GapPlanner that connects a rep's
 * SKILL gaps to their QUOTA gap and prioritizes the highest payoff-per-effort actions.
 *
 * HONESTY (REFRACTOR_PLAN.md §8): "skills mastered → projected quota readiness" is an
 * UNPROVEN heuristic, unlike exam-weightage → marks. We expose it as a transparent,
 * clearly-labeled readiness number and anchor the real pitch on measured ramp/attainment.
 * The skill prioritization itself (impact × low mastery) is sound and reuses the SAME
 * engine functions as Kalnehi's blueprint.
 */
import type { Deal } from "@engine/providers/crm";
import {
  projectOutcomeLinear,
  sortByPayoff,
} from "@engine/planning/gapPlanner";

export interface PlaybookSkill {
  id: string;
  label: string;
  /** Relative impact on revenue (engine weight). */
  impact: number;
  /** 0..100 mastery. */
  masteryPercent: number;
}

export interface SkillPriority {
  id: string;
  label: string;
  impact: number;
  masteryPercent: number;
}

export interface AccountToActOn {
  externalId: string;
  name: string;
  amount: number;
  stage: Deal["stage"];
}

export interface QuotaGapPlan {
  /** Heuristic, clearly-labeled — NOT a guarantee. */
  projectedReadinessPct: number;
  quotaGap: number;
  /** Weakest high-impact skills to drill, highest payoff first. */
  skillPriorities: SkillPriority[];
  /** Open deals with the most upside, highest amount first. */
  accountsToActOn: AccountToActOn[];
}

export interface QuotaGapInput {
  skills: readonly PlaybookSkill[];
  deals: readonly Deal[];
  quota: number;
  wonAmount: number;
  maxSkills?: number;
  maxAccounts?: number;
}

export function planQuotaGap(input: QuotaGapInput): QuotaGapPlan {
  const branches = input.skills.map((s) => ({
    weight: s.impact,
    progressPercent: s.masteryPercent,
  }));
  const { projected } = projectOutcomeLinear(branches, 100);

  const skillPriorities = sortByPayoff(
    input.skills.filter((s) => s.masteryPercent < 100),
    (s) => s.impact,
    (s) => s.masteryPercent,
  )
    .slice(0, input.maxSkills ?? 3)
    .map((s) => ({
      id: s.id,
      label: s.label,
      impact: s.impact,
      masteryPercent: s.masteryPercent,
    }));

  const accountsToActOn = input.deals
    .filter((d) => d.stage !== "won" && d.stage !== "lost")
    .toSorted((a, b) => b.amount - a.amount)
    .slice(0, input.maxAccounts ?? 3)
    .map((d) => ({
      externalId: d.externalId,
      name: d.name,
      amount: d.amount,
      stage: d.stage,
    }));

  return {
    projectedReadinessPct: projected,
    quotaGap: Math.max(0, input.quota - input.wonAmount),
    skillPriorities,
    accountsToActOn,
  };
}
