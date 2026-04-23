"use client";

import type { SystemHealthSnapshot } from "@/lib/admin/queries/systemHealthQueries";
import { AdminKpiCard } from "@/components/admin/AdminKpiCard";

export function AdminSystemHealthClient({ data }: { data: SystemHealthSnapshot }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-kal-text">System health</h1>
        <p className="mt-1 text-sm text-kal-muted">Lightweight probes from the admin server context.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <AdminKpiCard
          label="DB ping"
          value={data.dbPingMs != null ? `${data.dbPingMs} ms` : "failed"}
          sub={data.dbError ?? undefined}
        />
      </div>

      <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-kal-text">Admin config (cron-related keys)</h2>
        {data.adminConfigCronKeys.length === 0 ? (
          <p className="text-sm text-kal-muted">No cron_* keys in admin_config yet.</p>
        ) : (
          <ul className="font-mono text-xs space-y-1">
            {data.adminConfigCronKeys.map((r) => (
              <li key={r.key} className="flex justify-between gap-2">
                <span className="text-kal-accent">{r.key}</span>
                <span className="truncate text-kal-muted">{r.value}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4 text-sm text-kal-text-secondary space-y-2">
        <p>{data.vercelHint}</p>
        <p>{data.razorpayWebhookNote}</p>
      </div>
    </div>
  );
}
