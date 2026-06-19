"use client";

/**
 * Manager dashboard — the buyer's "money screen". Anchored on MEASURED metrics (ramp +
 * attainment) from the rep's deals; the quota-gap readiness % is shown as a transparent,
 * clearly-labeled heuristic (per REFRACTOR_PLAN honesty note), not a guarantee.
 * Runs on demo data so it demos without a database.
 */
import { useMemo } from "react";

import {
  DEMO_DEALS,
  DEMO_QUOTA,
  DEMO_REP_START_DATE,
  DEMO_SKILLS,
  formatCurrency,
} from "@/lib/fizaki/demoData";
import { planQuotaGap } from "@/lib/fizaki/quotaGapPlanner";
import { computeRampMetrics } from "@/lib/fizaki/rampMetrics";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-kal-border bg-kal-card p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-kal-muted">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-kal-text">{value}</p>
    </div>
  );
}

export function ManagerDashboardClient() {
  const metrics = useMemo(
    () =>
      computeRampMetrics({
        deals: DEMO_DEALS,
        repStartDate: DEMO_REP_START_DATE,
        quota: DEMO_QUOTA,
      }),
    [],
  );

  const plan = useMemo(
    () =>
      planQuotaGap({
        skills: DEMO_SKILLS,
        deals: DEMO_DEALS,
        quota: DEMO_QUOTA,
        wonAmount: metrics.wonAmount,
      }),
    [metrics.wonAmount],
  );

  return (
    <section className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold tracking-tight text-kal-text">Team</h1>
      <p className="mt-1 text-sm text-kal-text-secondary">
        Prove enablement drives revenue.{" "}
        <span className="text-kal-muted">(Demo rep)</span>
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Stat label="Quota attainment" value={`${metrics.attainmentPct}%`} />
        <Stat
          label="Days to first deal"
          value={metrics.daysToFirstDeal === null ? "—" : `${metrics.daysToFirstDeal}d`}
        />
        <Stat
          label="Days to full productivity"
          value={
            metrics.daysToFullProductivity === null
              ? "in progress"
              : `${metrics.daysToFullProductivity}d`
          }
        />
        <Stat label="Open pipeline" value={formatCurrency(metrics.openPipelineAmount)} />
      </div>

      <div className="mt-5 rounded-xl border border-kal-border bg-kal-card p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold text-kal-text">Quota-gap plan</p>
          <p className="text-xs text-kal-muted">
            gap {formatCurrency(plan.quotaGap)}
          </p>
        </div>
        <p className="mt-1 text-xs text-kal-muted">
          Projected readiness {plan.projectedReadinessPct}% — heuristic estimate, not a
          forecast.
        </p>

        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-kal-muted">
          Drill these skills
        </p>
        <ul className="mt-1.5 space-y-1.5">
          {plan.skillPriorities.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between text-sm text-kal-text"
            >
              <span>{s.label}</span>
              <span className="text-xs text-kal-muted">{s.masteryPercent}% mastered</span>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-kal-muted">
          Act on these accounts
        </p>
        <ul className="mt-1.5 space-y-1.5">
          {plan.accountsToActOn.map((a) => (
            <li
              key={a.externalId}
              className="flex items-center justify-between text-sm text-kal-text"
            >
              <span className="truncate">{a.name}</span>
              <span className="ml-3 shrink-0 text-xs text-kal-muted">
                {formatCurrency(a.amount)} · {a.stage}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
