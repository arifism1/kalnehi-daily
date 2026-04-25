/** One line per weekday index 0=Sun … 6=Sat (length 7). */
export const MORNING_QUOTES_WEEKDAY: readonly string[] = [
  "Ease in gently — one clear plan is enough to steer the day.",
  "The week is new where you are; let today be steady, not perfect.",
  "You don’t have to feel ready — you only have to begin.",
  "Your routine is a quiet kind of discipline; show up, then refine.",
  "The mountain is still there; take this hour as your rope length.",
  "Rest was part of the work; now carry that calm into the first task.",
  "Close the week with presence — a small win still moves the mark.",
] as const;

/**
 * 0=Sunday … 6=Saturday, matching JS `getDay()`.
 */
export function getMorningQuoteForDay(day: number): string {
  const i = day >= 0 && day < MORNING_QUOTES_WEEKDAY.length ? day : 0;
  return MORNING_QUOTES_WEEKDAY[i] ?? MORNING_QUOTES_WEEKDAY[0]!;
}
