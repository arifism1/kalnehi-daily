"use client";

import type { EngagementSnapshot } from "@/lib/admin/queries/engagementQueries";
import { AdminKpiCard } from "@/components/admin/AdminKpiCard";

export function AdminEngagementClient({ data }: { data: EngagementSnapshot }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-kal-text">Engagement</h1>
        <p className="mt-1 text-sm text-kal-muted">Trial-period behaviour proxies (7d window) + feature_events.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <AdminKpiCard label="Trial users (approx.)" value={data.trialUsersApprox} />
        <AdminKpiCard label="Study sessions (7d)" value={data.studySessionsLast7d} />
        <AdminKpiCard label="Voice entries (7d)" value={data.voiceEntriesLast7d} />
        <AdminKpiCard label="PrepBrain conv. (7d)" value={data.prepbrainConversationsLast7d} />
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
