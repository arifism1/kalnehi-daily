import type { Tables } from "@/types/supabase";

export type SyllabusRow = Tables<"syllabus_master"> & {
  /** From `chapter_marks` via `injectChapterMarksIntoRows`; not a column on syllabus_master. */
  marks_2026?: number | null;
};

const SUBJECT_ORDER = ["Physics", "Chemistry", "Biology"];

/**
 * Numeric UNIT order (UNIT 2 before UNIT 10), then localeCompare fallback.
 */
export function compareChapterNames(a: string, b: string): number {
  const s = a.trim();
  const t = b.trim();
  const re = /unit\s*(\d+)/i;
  const ma = s.match(re);
  const mb = t.match(re);
  if (ma && mb) {
    const na = parseInt(ma[1]!, 10);
    const nb = parseInt(mb[1]!, 10);
    if (na !== nb) return na - nb;
  }
  return s.localeCompare(t, undefined, { numeric: true, sensitivity: "base" });
}

export function sortChapterNameList(names: string[]): string[] {
  return [...names].sort(compareChapterNames);
}

/** Subject → chapter unit order → microtopic label. */
export function sortSyllabusRows(rows: SyllabusRow[]): SyllabusRow[] {
  return [...rows].sort((a, b) => {
    const subA = a.subject || "Other";
    const subB = b.subject || "Other";
    const subCmp = sortSubjects(subA, subB);
    if (subCmp !== 0) return subCmp;
    const chCmp = compareChapterNames(
      a.chapter || "General",
      b.chapter || "General",
    );
    if (chCmp !== 0) return chCmp;
    return (a.microtopic || "").localeCompare(b.microtopic || "");
  });
}

export function sortSubjects(a: string, b: string): number {
  const ia = SUBJECT_ORDER.findIndex(
    (x) => x.toLowerCase() === a.trim().toLowerCase(),
  );
  const ib = SUBJECT_ORDER.findIndex(
    (x) => x.toLowerCase() === b.trim().toLowerCase(),
  );
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  return a.localeCompare(b);
}

export function groupBySubjectAndChapter(rows: SyllabusRow[]) {
  const map = new Map<string, Map<string, SyllabusRow[]>>();
  for (const r of rows) {
    const sub = r.subject || "Other";
    const ch = r.chapter || "General";
    if (!map.has(sub)) map.set(sub, new Map());
    const chMap = map.get(sub)!;
    if (!chMap.has(ch)) chMap.set(ch, []);
    chMap.get(ch)!.push(r);
  }
  for (const chMap of map.values()) {
    for (const list of chMap.values()) {
      list.sort((a, b) => a.microtopic.localeCompare(b.microtopic));
    }
  }
  return map;
}

export function chapterKey(subject: string, chapter: string): string {
  return `${subject}\u0000${chapter}`;
}
