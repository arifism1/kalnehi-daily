"use client";

import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

import type { AiUsageSnapshot } from "@/lib/admin/queries/aiUsageQueries";
import { AdminChart } from "@/components/admin/AdminChart";
import { AdminKpiCard } from "@/components/admin/AdminKpiCard";

export function AdminAiUsageClient({ data }: { data: AiUsageSnapshot }) {
  const chartData = data.tokensFinalizedByDay;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-kal-text">AI usage &amp; cost</h1>
        <p className="mt-1 text-sm text-kal-muted">
          Tokens from finalized Mastermind reservations. Cost uses ADMIN_INR_PER_MILLION_AI_TOKENS (default 50).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <AdminKpiCard label="Tokens today" value={data.tokensToday.toLocaleString("en-IN")} />
        <AdminKpiCard label="Tokens (7d)" value={data.tokensThisWeek.toLocaleString("en-IN")} />
        <AdminKpiCard label="Tokens (30d)" value={data.tokensThisMonth.toLocaleString("en-IN")} />
        <AdminKpiCard label="Cost today (est.)" value={`₹${data.costTodayInr.toFixed(0)}`} />
        <AdminKpiCard label="Cost 7d (est.)" value={`₹${data.costThisWeekInr.toFixed(0)}`} />
        <AdminKpiCard label="Cost 30d (est.)" value={`₹${data.costThisMonthInr.toFixed(0)}`} />
        <AdminKpiCard
          label="AI cost % of MRR (30d)"
          value={data.costPercentOfMrr != null ? `${data.costPercentOfMrr.toFixed(1)}%` : "—"}
        />
        <AdminKpiCard
          label="Trial token hit rate (~90% cap)"
          value={`${data.trialTokenHitRatePct.toFixed(0)}%`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AdminKpiCard
          label="Avg tokens / paying user (window)"
          value={Math.round(data.avgTokensPerPayingUser).toLocaleString("en-IN")}
        />
        <AdminKpiCard
          label="Avg tokens / trial user (window)"
          value={Math.round(data.avgTokensPerTrialUser).toLocaleString("en-IN")}
        />
      </div>

      <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
        <h2 className="text-sm font-semibold text-kal-text mb-2">Tokens finalized by day</h2>
        <AdminChart height={280}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--kal-border)" />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="var(--kal-muted)" />
            <YAxis tick={{ fontSize: 10 }} stroke="var(--kal-muted)" />
            <Tooltip />
            <Area type="monotone" dataKey="tokens" stroke="var(--kal-accent)" fill="var(--kal-accent)" fillOpacity={0.2} />
          </AreaChart>
        </AdminChart>
      </div>
    </div>
  );
}
