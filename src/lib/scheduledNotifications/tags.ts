export const SCHEDULED_NOTIFICATION_TAGS = [
  "Revision",
  "Study",
  "Break",
  "Admin",
  "Other",
] as const;

export type ScheduledNotificationTag = (typeof SCHEDULED_NOTIFICATION_TAGS)[number];
