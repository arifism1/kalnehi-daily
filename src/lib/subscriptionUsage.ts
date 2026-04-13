/**
 * Calendar-month AI usage boundaries (resets align with the 1st of each month in IST).
 * Uses Asia/Kolkata so reset timing matches the product audience expectation and is
 * consistent with PrepBrain token accounting (which also uses IST month keys).
 * Shared by server actions and client hooks so limits and "used" stay consistent.
 */

const USAGE_MONTH_TZ = "Asia/Kolkata";

function istMonthKey(now: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: USAGE_MONTH_TZ,
    year: "numeric",
    month: "2-digit",
  });
  const parts = fmt.formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${y}-${m}`;
}

export function currentUsageMonthKey(): string {
  return istMonthKey();
}

export function usageMonthKeyFromDateString(isoOrDate: string | null): string | null {
  if (!isoOrDate) return null;
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return null;
  return istMonthKey(d);
}

/** True when stored reset date is missing or belongs to a prior calendar month (IST). */
export function needsMonthlyUsageReset(usageResetDate: string | null): boolean {
  const current = currentUsageMonthKey();
  const stored = usageMonthKeyFromDateString(usageResetDate);
  return stored === null || stored !== current;
}

export function firstOfCurrentMonthDateString(): string {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: USAGE_MONTH_TZ,
    year: "numeric",
    month: "2-digit",
  });
  const parts = fmt.formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${y}-${m}-01`;
}

export function effectiveUsageForDisplay(
  usageResetDate: string | null,
  photoScansUsed: number,
  voiceMinutesUsed: number,
): { photoScansUsed: number; voiceMinutesUsed: number } {
  if (needsMonthlyUsageReset(usageResetDate)) {
    return { photoScansUsed: 0, voiceMinutesUsed: 0 };
  }
  return { photoScansUsed, voiceMinutesUsed };
}
