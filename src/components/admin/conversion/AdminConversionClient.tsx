"use client";

import type { ConversionSnapshot } from "@/lib/admin/queries/conversionQueries";
import { AdminKpiCard } from "@/components/admin/AdminKpiCard";

export function AdminConversionClient({ data }: { data: ConversionSnapshot }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-kal-text">Conversion</h1>
        <p className="mt-1 text-sm text-kal-muted">Trial-like users vs paying + paywall/feature_events (30d).</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <AdminKpiCard label="Trial-like users" value={data.trialLikeCount} />
        <AdminKpiCard label="Paying users" value={data.payingCount} />
        <AdminKpiCard label="Overall conversion %" value={`${data.overallConversionPct.toFixed(1)}%`} />
        <AdminKpiCard
          label="Paid ₹19 → monthly (of payers)"
          value={`${data.paidTrialToMonthlyPct.toFixed(0)}%`}
        />
        <AdminKpiCard label="₹19 skip users (ledger)" value={data.skipCount} />
        <AdminKpiCard label="Plan upgrades (30d)" value={data.planUpgrades30d} />
        <AdminKpiCard label="Annual (30d)" value={data.annualPlans30d} />
        <AdminKpiCard label="Paywall views (events)" value={data.paywallViews} />
        <AdminKpiCard label="Payers w/ PrepBrain touch" value={data.conversionsWithPrepbrainTouch} />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-kal-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-kal-border bg-kal-card/70">
              {["Exam", "Trials", "Paid", "Conv %"].map((h) => (
                <th key={h} className="px-3 py-3 text-left text-[10px] font-bold uppercase text-kal-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.byExam.map((r, i) => (
              <tr key={r.exam} className={i % 2 === 0 ? "bg-kal-card/20" : ""}>
                <td className="px-3 py-2">{r.exam}</td>
                <td className="px-3 py-2 tabular-nums">{r.trials}</td>
                <td className="px-3 py-2 tabular-nums">{r.paid}</td>
                <td className="px-3 py-2 tabular-nums">{r.pct.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
