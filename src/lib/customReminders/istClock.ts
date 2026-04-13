import { getIstCalendarDateString } from "@/lib/systemPush/istCalendarDate";

/** Minutes since midnight (0–1439) in Asia/Kolkata. */
export function getIstMinutesSinceMidnight(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return h * 60 + m;
}

/**
 * Parse Postgres `time` / `"HH:MM"` / `"HH:MM:SS"` to minutes since midnight.
 */
export function parseScheduledTimeToMinutes(value: string): number | null {
  const s = value.trim().replace(/\+.*$/, "");
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(s);
  if (!match) return null;
  const h = Number(match[1]);
  const min = Number(match[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/**
 * True when IST "now" is in [scheduled, scheduled + windowMinutes) on the same calendar day.
 */
export function isWithinIstFireWindow(
  scheduledMinutes: number,
  istNowMinutes: number,
  windowMinutes: number,
): boolean {
  if (windowMinutes <= 0) return false;
  const delta = istNowMinutes - scheduledMinutes;
  return delta >= 0 && delta < windowMinutes;
}

export { getIstCalendarDateString };
