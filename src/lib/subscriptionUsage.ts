/**
 * Calendar-month AI usage boundaries (resets align with the 1st of each month).
 * Shared by server actions and client hooks so limits and “used” stay consistent.
 */

export function currentUsageMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function usageMonthKeyFromDateString(isoOrDate: string | null): string | null {
  if (!isoOrDate) return null;
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** True when stored reset date is missing or belongs to a prior calendar month. */
export function needsMonthlyUsageReset(usageResetDate: string | null): boolean {
  const current = currentUsageMonthKey();
  const stored = usageMonthKeyFromDateString(usageResetDate);
  return stored === null || stored !== current;
}

export function firstOfCurrentMonthDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
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
