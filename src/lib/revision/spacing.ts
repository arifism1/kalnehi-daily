import { addDays, format, parseISO } from "date-fns";

/** Inclusive day ranges for confidence stars. */
const STAR_RANGES: Record<
  1 | 2 | 3 | 4 | 5,
  readonly [minDays: number, maxDays: number]
> = {
  1: [1, 2],
  2: [1, 2],
  3: [3, 4],
  4: [5, 7],
  5: [10, 14],
};

function starKey(n: number): 1 | 2 | 3 | 4 | 5 {
  const s = Math.min(5, Math.max(1, Math.round(n)));
  return s as 1 | 2 | 3 | 4 | 5;
}

/** Returns [minDays, maxDays] for the star level. */
export function suggestIntervalRangeForStars(
  stars: number,
): readonly [number, number] {
  const k = starKey(stars);
  if (k <= 2) return STAR_RANGES[1];
  return STAR_RANGES[k];
}

/**
 * Picks a random day count in the range, then returns yyyy-MM-dd from `fromDate` (local calendar).
 */
export function suggestedNextReviewDate(
  fromDateYyyyMmDd: string,
  stars: number,
): { suggested: string; minDays: number; maxDays: number } {
  const [lo, hi] = suggestIntervalRangeForStars(stars);
  const span = hi - lo;
  const offset = lo + (span > 0 ? Math.floor(Math.random() * (span + 1)) : 0);
  const d = addDays(parseISO(fromDateYyyyMmDd), offset);
  return {
    suggested: format(d, "yyyy-MM-dd"),
    minDays: lo,
    maxDays: hi,
  };
}
