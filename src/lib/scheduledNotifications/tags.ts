/** Shared with client UI and server actions — must not live in a `"use server"` file. */
export const SCHEDULED_NOTIFICATION_TAGS = [
  "Revision",
  "Study",
  "Break",
  "Admin",
  "Other",
] as const;

export type ScheduledNotificationTag = (typeof SCHEDULED_NOTIFICATION_TAGS)[number];
