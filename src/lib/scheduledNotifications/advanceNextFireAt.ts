import { addDays, addWeeks } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

/**
 * Next occurrence in the user's wall clock (DST-aware) after a successful send.
 */
export function advanceScheduledNotificationNextFireAt(
  prevIso: string,
  repeat: "daily" | "weekly",
  ianaTimeZone: string,
): string {
  const tz = ianaTimeZone.trim().slice(0, 120) || "UTC";
  const prev = new Date(prevIso);
  const zoned = toZonedTime(prev, tz);
  const bumped = repeat === "daily" ? addDays(zoned, 1) : addWeeks(zoned, 1);
  return fromZonedTime(bumped, tz).toISOString();
}
