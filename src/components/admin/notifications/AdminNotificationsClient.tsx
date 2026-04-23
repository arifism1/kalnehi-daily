"use client";

import type { NotificationAnalyticsSnapshot } from "@/lib/admin/queries/notificationQueries";
import { AdminKpiCard } from "@/components/admin/AdminKpiCard";

export function AdminNotificationsClient({ data }: { data: NotificationAnalyticsSnapshot }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-kal-text">Notification performance</h1>
        <p className="mt-1 text-sm text-kal-muted">
          From notification_sends table — instrument outbound sends to populate this view.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <AdminKpiCard label="Sends (30d sample)" value={data.totalSends} />
        <AdminKpiCard label="Delivery %" value={`${data.rates.deliveryPct.toFixed(1)}%`} />
        <AdminKpiCard label="Open %" value={`${data.rates.openPct.toFixed(1)}%`} />
        <AdminKpiCard label="Click %" value={`${data.rates.clickPct.toFixed(1)}%`} />
        <AdminKpiCard label="Attributed convert %" value={`${data.rates.convertPct.toFixed(1)}%`} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
          <h2 className="text-sm font-semibold text-kal-text mb-2">By type</h2>
          <ul className="text-sm space-y-1">
            {data.byType.map((r) => (
              <li key={r.notification_type} className="flex justify-between">
                <span className="truncate">{r.notification_type}</span>
                <span className="tabular-nums text-kal-muted">{r.count}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
          <h2 className="text-sm font-semibold text-kal-text mb-2">By channel</h2>
          <ul className="text-sm space-y-1">
            {data.byChannel.map((r) => (
              <li key={r.channel} className="flex justify-between">
                <span>{r.channel}</span>
                <span className="tabular-nums text-kal-muted">{r.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
