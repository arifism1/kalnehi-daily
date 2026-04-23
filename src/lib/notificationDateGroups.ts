import { format, isToday, isYesterday } from "date-fns";

import type { UserNotification } from "@/actions/notifications";

export type NotificationDayGroup = {
  dayKey: string;
  label: string;
  items: UserNotification[];
};

function daySectionLabel(d: Date): string {
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMMM d, yyyy");
}

/** Groups a newest-first list into local-calendar-day runs (order preserved). */
export function groupUserNotificationsByLocalDay(
  notifications: UserNotification[],
): NotificationDayGroup[] {
  const groups: NotificationDayGroup[] = [];
  for (const item of notifications) {
    const d = new Date(item.created_at);
    const dayKey = format(d, "yyyy-MM-dd");
    const last = groups[groups.length - 1];
    if (last?.dayKey === dayKey) {
      last.items.push(item);
    } else {
      groups.push({
        dayKey,
        label: daySectionLabel(d),
        items: [item],
      });
    }
  }
  return groups;
}
