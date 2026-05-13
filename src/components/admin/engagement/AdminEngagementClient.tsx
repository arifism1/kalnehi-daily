"use client";

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

import type { EngagementSnapshot } from "@/lib/admin/queries/engagementQueries";
import { AdminChart } from "@/components/admin/AdminChart";
import { AdminKpiCard } from "@/components/admin/AdminKpiCard";

export function AdminEngagementClient({ data }: { data: EngagementSnapshot }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-kal-text">Engagement</h1>
        <p className="mt-1 text-sm text-kal-muted">Trial-period behaviour proxies (7d window) + feature_events.</p>
      </div>

      {data.activeTime ? (
        <>
          <div>
            <h2 className="text-lg font-semibold text-kal-text">App active time</h2>
            <p className="mt-1 text-sm text-kal-muted">
              Foreground tab seconds rolled up per user per IST day (authenticated app shell only).
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <AdminKpiCard
              label="Active hours (7d)"
              value={data.activeTime.hoursLast7d.toFixed(1)}
              sub="Σ user-time"
            />
            <AdminKpiCard
              label="Active hours (30d)"
              value={data.activeTime.hoursLast30d.toFixed(1)}
              sub="Σ user-time"
            />
            <AdminKpiCard
              label="Users w/ activity (7d)"
              value={data.activeTime.distinctUsersLast7d.toLocaleString("en-IN")}
            />
            <AdminKpiCard
              label="Avg min / day (active users)"
              value={data.activeTime.avgDailyMinutesAmongActiveLast7d.toFixed(1)}
              sub="7d window"
            />
          </div>
          <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
            <h2 className="text-sm font-semibold text-kal-text mb-2">Sum of active minutes by IST day (7d)</h2>
            <AdminChart height={260}>
              <BarChart data={data.activeTime.minutesByDayLast7d}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--kal-border)" />
                <XAxis dataKey="day" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="minutes" fill="oklch(0.52 0.12 160)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </AdminChart>
          </div>
        </>
      ) : (
        <p className="text-sm text-kal-muted">
          App active-time charts require the{" "}
          <code className="rounded bg-kal-card-muted px-1 text-xs">user_app_active_time_daily</code> migration and{" "}
          <code className="rounded bg-kal-card-muted px-1 text-xs">admin_active_time_summary</code> RPC.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <AdminKpiCard label="Trial users (approx.)" value={data.trialUsersApprox} />
        <AdminKpiCard label="Study sessions (7d)" value={data.studySessionsLast7d} />
        <AdminKpiCard label="Voice entries (7d)" value={data.voiceEntriesLast7d} />
        <AdminKpiCard label="Mastermind conv. (7d)" value={data.prepbrainConversationsLast7d} />
        <AdminKpiCard
          label="Token cap hit rate (trial)"
          value={`${data.tokenHitRateTrialPct.toFixed(0)}%`}
          sub="~90% of welcome cap"
        />
      </div>

      {data.featureSummary && (
        <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
          <h2 className="text-sm font-semibold text-kal-text mb-2">Feature events (7d)</h2>
          <ul className="text-sm space-y-1 max-h-64 overflow-y-auto">
            {data.featureSummary.byFeature.map((f) => (
              <li key={f.feature} className="flex justify-between">
                <span>{f.feature}</span>
                <span className="tabular-nums text-kal-muted">{f.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
