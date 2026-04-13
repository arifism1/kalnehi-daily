/** Max monthly plan billing cycles (Razorpay `total_count`) for new checkouts. */
export const AUTOPAY_MONTHS_MAX = 12;
export const AUTOPAY_MONTHS_MIN = 1;
/** Default when the client omits a value (pricing UI should always send a choice). */
export const DEFAULT_AUTOPAY_MONTHS = 6;

export function clampAutopayMonths(raw: unknown): number {
  const n =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Number.parseInt(raw, 10)
        : Number.NaN;
  if (!Number.isFinite(n)) return DEFAULT_AUTOPAY_MONTHS;
  return Math.min(AUTOPAY_MONTHS_MAX, Math.max(AUTOPAY_MONTHS_MIN, Math.trunc(n)));
}

export function autopayMonthsFromNotes(
  notes: Record<string, string> | undefined,
): number | null {
  const raw = notes?.kalnehi_autopay_months?.trim() ?? "";
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < AUTOPAY_MONTHS_MIN) return null;
  return clampAutopayMonths(n);
}
