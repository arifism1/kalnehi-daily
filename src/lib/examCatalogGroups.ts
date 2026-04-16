import type { ExamCatalogRow } from "@/lib/examsCatalog";

/** Ordered section labels for `<optgroup>` (matches product exam expansion spec). */
export const EXAM_GROUP_ORDER = [
  "Engineering & Tech",
  "Medical Sciences",
  "Management & Business",
  "Finance & Law",
  "Civil & Defense Services",
  "Study Abroad & Foundation",
  "Common University Entrance",
  "Other",
] as const;

export type ExamGroupLabel = (typeof EXAM_GROUP_ORDER)[number];

const KNOWN_EXAM_TO_GROUP = new Map<string, ExamGroupLabel>([
  ["JEE Main 2025", "Engineering & Tech"],
  ["JEE Advanced", "Engineering & Tech"],
  ["GATE", "Engineering & Tech"],
  ["NEET UG", "Medical Sciences"],
  ["NEET PG", "Medical Sciences"],
  ["INI-CET", "Medical Sciences"],
  ["CAT", "Management & Business"],
  ["GMAT", "Management & Business"],
  ["IPMAT Indore", "Management & Business"],
  ["IPMAT Rohtak", "Management & Business"],
  ["JIPMAT", "Management & Business"],
  ["CA Foundation", "Finance & Law"],
  ["CA Intermediate", "Finance & Law"],
  ["CA Final", "Finance & Law"],
  ["CLAT UG", "Finance & Law"],
  ["UPSC CSE Prelims", "Civil & Defense Services"],
  ["UPSC CSE Mains", "Civil & Defense Services"],
  ["NDA", "Civil & Defense Services"],
  ["SAT", "Study Abroad & Foundation"],
  ["GRE", "Study Abroad & Foundation"],
  ["CBSE Class 12", "Study Abroad & Foundation"],
  ["CUET", "Common University Entrance"],
  ["Other", "Other"],
]);

/**
 * Maps `exams.exam_name` to optgroup label. Unknown keys (e.g. orphan profile values) go to **Other**.
 */
export function examGroupForExamName(examName: string): ExamGroupLabel {
  return KNOWN_EXAM_TO_GROUP.get(examName.trim()) ?? "Other";
}

export type GroupedExamRows = { group: ExamGroupLabel; rows: ExamCatalogRow[] };

/**
 * Buckets catalog rows by group; preserves global `sort_order` inside each group.
 */
export function groupExamRowsForSelect(rows: ExamCatalogRow[]): GroupedExamRows[] {
  const byGroup = new Map<ExamGroupLabel, ExamCatalogRow[]>();
  for (const label of EXAM_GROUP_ORDER) {
    byGroup.set(label, []);
  }
  for (const row of rows) {
    const g = examGroupForExamName(row.exam_name);
    const arr = byGroup.get(g) ?? byGroup.get("Other")!;
    arr.push(row);
  }
  const out: GroupedExamRows[] = [];
  for (const label of EXAM_GROUP_ORDER) {
    const bucket = byGroup.get(label) ?? [];
    if (bucket.length === 0) continue;
    bucket.sort((a, b) => a.sort_order - b.sort_order);
    out.push({ group: label, rows: bucket });
  }
  return out;
}
