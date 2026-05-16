/** Local hour (0–23) after which we show the end-of-day nudge banner. */
export const EOD_BANNER_START_HOUR_LOCAL = 18;

export function eodNudgeDismissStorageKey(isoCalendarDate: string): string {
  return `kalnehi:eod_nudge:dismiss:${isoCalendarDate}`;
}

export function readEodBannerDismissedForDate(isoCalendarDate: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(eodNudgeDismissStorageKey(isoCalendarDate)) === "1";
  } catch {
    return false;
  }
}

export function writeEodBannerDismissedForDate(isoCalendarDate: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(eodNudgeDismissStorageKey(isoCalendarDate), "1");
  } catch {
    // ignore quota / privacy mode
  }
}

/** True when local clock hour is >= start hour through end of calendar day (before midnight). */
export function isWithinEveningBannerWindow(now: Date): boolean {
  const h = now.getHours();
  return h >= EOD_BANNER_START_HOUR_LOCAL && h <= 23;
}
