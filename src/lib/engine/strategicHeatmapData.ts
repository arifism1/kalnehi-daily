import type { ChapterRollup } from "@/lib/syllabusRollup";

/** Higher = prioritize: weak completion × high chapter weight */
export type StrategicRow = {
  subject: string;
  chapter: string;
  microtopicProgressPercent: number;
  chapterMarksTotal: number;
  /** 0–100 approximate priority */
  priorityScore: number;
  isChapterMastered: boolean;
};

export function buildStrategicRows(chapters: ChapterRollup[]): StrategicRow[] {
  const rows: StrategicRow[] = [];
  for (const ch of chapters) {
    const w = Math.max(0.1, ch.chapterMarksTotal);
    const gap = (100 - ch.microtopicProgressPercent) / 100;
    const priorityScore = Math.round(gap * w * 10) / 10;
    rows.push({
      subject: ch.subject,
      chapter: ch.chapter,
      microtopicProgressPercent: ch.microtopicProgressPercent,
      chapterMarksTotal: ch.chapterMarksTotal,
      priorityScore,
      isChapterMastered: ch.isChapterMastered,
    });
  }
  rows.sort((a, b) => b.priorityScore - a.priorityScore);
  return rows;
}
