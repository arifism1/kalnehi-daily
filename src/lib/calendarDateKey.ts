import { format, isValid, parseISO } from "date-fns";

/**
 * Normalizes stored date strings to `yyyy-MM-dd` for safe lexicographic compare
 * and equality (handles ISO date-times, unpadded month/day from legacy data).
 */
export function toCalendarDateKey(
  s: string | null | undefined,
): string | null {
  if (s == null || typeof s !== "string") return null;
  const t = s.trim();
  if (t.length === 0) return null;
  const m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const y = m[1]!;
    const mo = m[2]!.padStart(2, "0");
    const d = m[3]!.padStart(2, "0");
    if (y.length === 4) return `${y}-${mo}-${d}`;
  }
  const parsed = parseISO(t);
  if (isValid(parsed)) return format(parsed, "yyyy-MM-dd");
  return null;
}
