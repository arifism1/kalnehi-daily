import { NotificationsToastProvider } from "@/components/settings/notificationsToastContext";
import type { ScheduledNotificationRow } from "@/actions/scheduledNotifications";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { NotificationHubPageClient } from "./NotificationHubPageClient";

export default async function NotificationHubPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialRows: ScheduledNotificationRow[] = [];
  if (user) {
    const { data } = await supabase
      .from("user_scheduled_notifications")
      .select("*")
      .order("next_fire_at", { ascending: true });
    initialRows = (data ?? []) as ScheduledNotificationRow[];
  }

  return (
    <NotificationsToastProvider>
      <NotificationHubPageClient initialRows={initialRows} userId={user?.id ?? null} />
    </NotificationsToastProvider>
  );
}
