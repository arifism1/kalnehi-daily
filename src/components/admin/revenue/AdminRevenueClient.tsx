"use client";

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

import type { RevenueSnapshot } from "@/lib/admin/queries/revenueQueries";
import { AdminChart } from "@/components/admin/AdminChart";
import { AdminKpiCard } from "@/components/admin/AdminKpiCard";

export function AdminRevenueClient({ data }: { data: RevenueSnapshot }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-kal-text">Revenue</h1>
        <p className="mt-1 text-sm text-kal-muted">MRR/ARR estimates from active subscriptions + payment ledger totals.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <AdminKpiCard label="MRR (est.)" value={`₹${Math.round(data.mrrInr).toLocaleString("en-IN")}`} />
        <AdminKpiCard label="ARR (est.)" value={`₹${Math.round(data.arrInr).toLocaleString("en-IN")}`} />
        <AdminKpiCard label="Paying users" value={data.payingUserCount} />
        <AdminKpiCard label="ARPU (est.)" value={`₹${data.arpuInr.toFixed(0)}`} />
        <AdminKpiCard label="New MRR this month" value={`₹${Math.round(data.newMrrThisMonthInr)}`} />
        <AdminKpiCard label="Churned MRR this month" value={`₹${Math.round(data.churnedMrrThisMonthInr)}`} />
        <AdminKpiCard
          label="Net MRR change"
          value={`₹${Math.round(data.netMrrChangeInr)}`}
        />
        <AdminKpiCard label="Grace period users" value={data.graceUserCount} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
          <h2 className="text-sm font-semibold text-kal-text">Revenue from ledger (by kind)</h2>
          <ul className="mt-3 space-y-1 text-sm text-kal-text-secondary">
            <li>Monthly plan payments (sum est.): ₹{data.revenueMonthlyPlanInr.toLocaleString("en-IN")}</li>
            <li>Annual plan payments (sum est.): ₹{data.revenueAnnualPlanInr.toLocaleString("en-IN")}</li>
            <li>₹19 smart trial / skip: ₹{data.revenueSmartTrialInr.toLocaleString("en-IN")}</li>
            <li className="text-xs text-kal-muted">Rows scanned: {data.paymentRowsAnalyzed}</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
          <h2 className="text-sm font-semibold text-kal-text">Plan mix</h2>
          <p className="mt-2 text-sm text-kal-text-secondary">
            Monthly: {data.payingMonthlyCount} · Annual: {data.payingAnnualCount}
          </p>
          <p className="mt-1 text-sm">
            Split: {data.monthlyVsAnnualPercent.monthlyPct.toFixed(0)}% monthly /{" "}
            {data.monthlyVsAnnualPercent.annualPct.toFixed(0)}% annual
          </p>
          <div className="mt-3 text-xs text-kal-muted">
            Autopay months:{" "}
            {data.autopayDistribution.map((d) => `${d.months}mo×${d.count}`).join(", ") || "—"}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
        <h2 className="text-sm font-semibold text-kal-text mb-2">Revenue by day (last ~30 from sample)</h2>
        <AdminChart height={260}>
          <BarChart data={data.revenueByDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--kal-border)" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="var(--kal-muted)" />
            <YAxis tick={{ fontSize: 10 }} stroke="var(--kal-muted)" />
            <Tooltip />
            <Bar dataKey="inr" name="₹" fill="oklch(0.65 0.18 145)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </AdminChart>
      </div>
    </div>
  );
}
