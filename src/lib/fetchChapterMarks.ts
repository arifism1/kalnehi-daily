import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";
import type { SyllabusRow } from "@/lib/syllabusGrouping";

type Client = SupabaseClient<Database>;

export type ChapterMarksEntry = {
  marks_2026: number | null;
  marks_2025: number | null;
  marks_2024: number | null;
  marks_2023: number | null;
};

/** Key for the chapter marks lookup map: "subject\0chapter" */
function chapterMarksKey(subject: string, chapter: string): string {
  return `${subject}\u0000${chapter}`;
}

/**
 * Fetches all chapter_marks rows for one exam and returns a lookup map
 * keyed by "subject\0chapter".
 */
export async function fetchChapterMarks(
  supabase: Client,
  examName: string,
): Promise<Map<string, ChapterMarksEntry>> {
  const { data, error } = await supabase
    .from("chapter_marks")
    .select("subject, chapter, marks_2026, marks_2025, marks_2024, marks_2023")
    .eq("exam_name", examName);

  if (error) throw error;

  const map = new Map<string, ChapterMarksEntry>();
  for (const row of data ?? []) {
    map.set(chapterMarksKey(row.subject, row.chapter), {
      marks_2026: row.marks_2026 as number | null,
      marks_2025: row.marks_2025 as number | null,
      marks_2024: row.marks_2024 as number | null,
      marks_2023: row.marks_2023 as number | null,
    });
  }
  return map;
}

/**
 * Injects chapter marks into each syllabus row so the existing rollup logic
 * (`chapterMarksPoolForYearRows`) continues to work without changes.
 *
 * All microtopic rows in a chapter receive the same chapter marks value.
 * The "all values equal → use once" branch in chapterMarksPoolForYearRows
 * then correctly treats that as a single chapter weight.
 *
 * If a row's chapter has no entry in chapter_marks (un-seeded exam), the
 * row keeps its current marks (0 after the migration).
 */
export function injectChapterMarksIntoRows<T extends SyllabusRow>(
  rows: T[],
  chapterMarks: Map<string, ChapterMarksEntry>,
): T[] {
  return rows.map((row) => {
    const entry = chapterMarks.get(
      chapterMarksKey(row.subject ?? "", row.chapter ?? ""),
    );
    if (!entry) return row;
    return {
      ...row,
      marks_2026: entry.marks_2026 ?? 0,
      marks_2025: entry.marks_2025 ?? 0,
      marks_2024: entry.marks_2024 ?? 0,
      marks_2023: entry.marks_2023 ?? 0,
    };
  });
}
