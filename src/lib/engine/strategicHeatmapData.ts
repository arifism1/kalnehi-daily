import {
  buildChapterBuckets,
  chapterMarksPoolForYearRows,
  type ChapterRollup,
  type SyllabusRow,
} from "@/lib/syllabusRollup";

/** Exam years used for flexible chapter weight averaging (marks columns on each row). */
const MARKS_AVERAGE_YEARS = [2025, 2024, 2023] as const;

/**
 * For one chapter’s microtopic rows: take the chapter pool weight per year
 * (same rules as rollup — overrides merged into rows, dedupe vs split sums).
 * Average only years with pool &gt; 0. If none, return 0.
 */
export function averageChapterMarksAcrossFilledYears(
  list: SyllabusRow[],
): number {
  const pools: number[] = [];
  for (const year of MARKS_AVERAGE_YEARS) {
    const w = chapterMarksPoolForYearRows(list, year);
    if (w > 0) pools.push(w);
  }
  if (pools.length === 0) return 0;
  return pools.reduce((a, b) => a + b, 0) / pools.length;
}

/** Higher = prioritize: weak completion × high chapter weight */
export type StrategicRow = {
  subject: string;
  chapter: string;
  microtopicProgressPercent: number;
  /** Simple average of positive chapter pools across filled marks years (2025/2024/2023). */
  chapterMarksTotal: number;
  /** 0–100 approximate priority */
  priorityScore: number;
  isChapterMastered: boolean;
};

export function buildStrategicRows(
  chapters: ChapterRollup[],
  allRows: SyllabusRow[],
): StrategicRow[] {
  const buckets = buildChapterBuckets(allRows);
  const rows: StrategicRow[] = [];
  for (const ch of chapters) {
    const key = `${ch.subject}\u0000${ch.chapter}`;
    const list = buckets.get(key) ?? [];
    const weight = averageChapterMarksAcrossFilledYears(list);
    const gap = (100 - ch.microtopicProgressPercent) / 100;
    const priorityScore = Math.round(gap * weight * 10) / 10;
    rows.push({
      subject: ch.subject,
      chapter: ch.chapter,
      microtopicProgressPercent: ch.microtopicProgressPercent,
      chapterMarksTotal: weight,
      priorityScore,
      isChapterMastered: ch.isChapterMastered,
    });
  }
  rows.sort((a, b) => b.priorityScore - a.priorityScore);
  return rows;
}
