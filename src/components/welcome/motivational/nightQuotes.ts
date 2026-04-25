/** Exam-focused, emotional; one per weekday index 0=Sun … 6=Sat. */
export const NIGHT_QUOTES_WEEKDAY: readonly string[] = [
  "Every rep you don’t see still counts. Your future paper remembers the quiet work.",
  "Courage in exam season is small and daily — show up, stay honest, don’t flinch away.",
  "The rank you want is not a mood. It is the sum of days you refused to give up on.",
  "You are allowed to be tired. You are not allowed to forget why you started.",
  "Doubt is loud the night before; discipline is the voice that gets you to the chair.",
  "Someone out there is hoping you quit. Love yourself enough to disappoint them.",
  "Rest is not betrayal of the goal — it is how your mind turns effort into memory.",
] as const;

export function getNightQuoteForDay(day: number): string {
  const i = day >= 0 && day < NIGHT_QUOTES_WEEKDAY.length ? day : 0;
  return NIGHT_QUOTES_WEEKDAY[i] ?? NIGHT_QUOTES_WEEKDAY[0]!;
}
