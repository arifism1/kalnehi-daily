import { listAdminAppUpdates } from "@/actions/adminNotifications";
import { AdminNotificationsClient } from "@/components/admin/notifications/AdminNotificationsClient";
import { getNotificationAnalyticsSnapshot } from "@/lib/admin/queries/notificationQueries";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const [data, updatesRes] = await Promise.all([
    getNotificationAnalyticsSnapshot(),
    listAdminAppUpdates(),
  ]);

  if (!data) {
    return <div className="text-sm text-red-500">Service role unavailable.</div>;
  }

  const appUpdates = updatesRes.ok ? updatesRes.updates : [];

  return <AdminNotificationsClient data={data} appUpdates={appUpdates} />;
}
