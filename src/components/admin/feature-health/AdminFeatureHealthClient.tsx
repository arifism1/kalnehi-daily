"use client";

import type { FeatureHealthSnapshot } from "@/lib/admin/queries/featureHealthQueries";

export function AdminFeatureHealthClient({ data }: { data: FeatureHealthSnapshot }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-kal-text">Feature health</h1>
        <p className="mt-1 text-sm text-kal-muted">Adoption (unique users) and overlap with currently paying users.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
          <h2 className="text-sm font-semibold text-kal-text mb-2">Adoption (30d)</h2>
          <ul className="text-sm space-y-1">
            {data.adoptionByFeature.map((r) => (
              <li key={r.feature} className="flex justify-between">
                <span>{r.feature}</span>
                <span className="tabular-nums text-kal-muted">{r.uniqueUsers}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
          <h2 className="text-sm font-semibold text-kal-text mb-2">Correlation hint (% of payers who used)</h2>
          <ul className="text-sm space-y-1">
            {data.correlationHints.map((r) => (
              <li key={r.feature} className="flex justify-between gap-2">
                <span className="truncate">{r.feature}</span>
                <span className="tabular-nums text-kal-muted">
                  {r.payingWithFeature}/{r.payingTotal} ({r.pct.toFixed(0)}%)
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
