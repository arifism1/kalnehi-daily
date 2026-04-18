import { advanceScheduledNotificationNextFireAt } from "@/lib/scheduledNotifications/advanceNextFireAt";

/** After a successful FCM send: deactivate once, or advance next_fire_at for recurring. */
export function computePostSendScheduledNotificationPatch(
  repeatType: string,
  prevNextFireIso: string,
  userTimezone: string,
): {
  is_active: boolean;
  next_fire_at?: string;
  last_fired_at: string;
  updated_at: string;
} {
  const nowIso = new Date().toISOString();
  if (repeatType === "once") {
    return { is_active: false, last_fired_at: nowIso, updated_at: nowIso };
  }
  if (repeatType === "daily" || repeatType === "weekly") {
    return {
      is_active: true,
      next_fire_at: advanceScheduledNotificationNextFireAt(
        prevNextFireIso,
        repeatType,
        userTimezone,
      ),
      last_fired_at: nowIso,
      updated_at: nowIso,
    };
  }
  return { is_active: false, last_fired_at: nowIso, updated_at: nowIso };
}
