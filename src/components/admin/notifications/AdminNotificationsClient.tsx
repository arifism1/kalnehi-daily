"use client";

import type { AdminAppUpdate } from "@/actions/adminNotifications.types";
import { AdminKpiCard } from "@/components/admin/AdminKpiCard";
import { AdminSendUpdateForm } from "@/components/admin/notifications/AdminSendUpdateForm";
import type { NotificationAnalyticsSnapshot } from "@/lib/admin/queries/notificationQueries";

type Props = {
  data: NotificationAnalyticsSnapshot;
  appUpdates: AdminAppUpdate[];
};

export function AdminNotificationsClient({ data, appUpdates }: Props) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-kal-text">Notifications</h1>
        <p className="mt-1 text-sm text-kal-muted">
          Broadcast feature updates to all users and review push/in-app performance.
        </p>
      </div>

      {/* Compose + history */}
      <AdminSendUpdateForm initialUpdates={appUpdates} />

      {/* Push analytics */}
      <section className="space-y-6">
        <h2 className="text-base font-semibold text-kal-text">Push notification performance</h2>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <AdminKpiCard label="Sends (30d sample)" value={data.totalSends} />
          <AdminKpiCard label="Delivery %" value={`${data.rates.deliveryPct.toFixed(1)}%`} />
          <AdminKpiCard label="Open %" value={`${data.rates.openPct.toFixed(1)}%`} />
          <AdminKpiCard label="Click %" value={`${data.rates.clickPct.toFixed(1)}%`} />
          <AdminKpiCard label="Attributed convert %" value={`${data.rates.convertPct.toFixed(1)}%`} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
            <h3 className="mb-2 text-sm font-semibold text-kal-text">By type</h3>
            <ul className="space-y-1 text-sm">
              {data.byType.map((r) => (
                <li key={r.notification_type} className="flex justify-between">
                  <span className="truncate">{r.notification_type}</span>
                  <span className="tabular-nums text-kal-muted">{r.count}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-kal-border bg-kal-card/40 p-4">
            <h3 className="mb-2 text-sm font-semibold text-kal-text">By channel</h3>
            <ul className="space-y-1 text-sm">
              {data.byChannel.map((r) => (
                <li key={r.channel} className="flex justify-between">
                  <span>{r.channel}</span>
                  <span className="tabular-nums text-kal-muted">{r.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
