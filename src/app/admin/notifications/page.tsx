import { AdminNotificationsClient } from "@/components/admin/notifications/AdminNotificationsClient";
import { getNotificationAnalyticsSnapshot } from "@/lib/admin/queries/notificationQueries";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const data = await getNotificationAnalyticsSnapshot();
  if (!data) {
    return <div className="text-sm text-red-500">Service role unavailable.</div>;
  }
  return <AdminNotificationsClient data={data} />;
}
