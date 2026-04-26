"use client";

import type { RetentionSnapshot } from "@/lib/admin/queries/retentionQueries";
import { AdminKpiCard } from "@/components/admin/AdminKpiCard";

export function AdminRetentionClient({ data }: { data: RetentionSnapshot }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-kal-text">Retention &amp; churn</h1>
        <p className="mt-1 text-sm text-kal-muted">
          Cohort = users with trial_started_at in month. &quot;Paying now&quot; = active subscription end in future.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <AdminKpiCard
          label="Approx. churn (30d window)"
          value={`${data.churnApproxMonthlyPct.toFixed(1)}%`}
          sub="cancellations / (paying + recent cancels)"
        />
        <AdminKpiCard
          label="Avg. days subscribed before cancel"
          value={data.avgSubscriptionDaysBeforeCancel != null ? data.avgSubscriptionDaysBeforeCancel.toFixed(0) : "—"}
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-kal-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-kal-border bg-kal-card/70">
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-kal-muted">Cohort</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-kal-muted">Trials started</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-kal-muted">Paying now</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-kal-muted">Retention %</th>
            </tr>
          </thead>
          <tbody>
            {data.cohorts.map((c, i) => (
              <tr key={c.cohortMonth} className={i % 2 === 0 ? "bg-kal-card/20" : ""}>
                <td className="px-4 py-2 font-medium">{c.cohortMonth}</td>
                <td className="px-4 py-2 tabular-nums">{c.trialStarted}</td>
                <td className="px-4 py-2 tabular-nums">{c.payingNow}</td>
                <td className="px-4 py-2 tabular-nums">{c.retentionPct.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
          <h2 className="text-sm font-semibold text-kal-text mb-2">Churn by track / exam (30d)</h2>
          <ul className="space-y-1 text-sm">
            {data.churnByExam.slice(0, 12).map((r) => (
              <li key={r.exam} className="flex justify-between gap-2">
                <span className="truncate text-kal-text-secondary">{r.exam}</span>
                <span className="tabular-nums text-kal-muted">{r.churnPct.toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
          <h2 className="text-sm font-semibold text-kal-text mb-2">Churn by plan type</h2>
          <ul className="space-y-1 text-sm">
            {data.churnByPlan.map((r) => (
              <li key={r.plan} className="flex justify-between">
                <span>{r.plan}</span>
                <span className="text-kal-muted">
                  cancelled {r.cancelledLast30d} · paying {r.paying}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
