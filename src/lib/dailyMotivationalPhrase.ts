/** Deterministic index 0..count-1 from a calendar date (YYYY-MM-DD). Same phrase all day, changes when the date string changes. */
export function pickDailyPhraseIndex(dateYmd: string, count: number): number {
  if (count <= 0) return 0;
  let h = 2166136261;
  for (let i = 0; i < dateYmd.length; i++) {
    h ^= dateYmd.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % count;
}

export type DailyMotivationalPhraseRow = {
  id: string;
  phrase: string;
  author: string | null;
  category: string;
};
