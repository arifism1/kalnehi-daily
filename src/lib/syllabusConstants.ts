export const MICROTOPIC_STATUSES = [
  "not_begun",
  "in_progress",
  "completed",
  "need_revision",
] as const;

export type MicrotopicProgressStatus =
  (typeof MICROTOPIC_STATUSES)[number];

export function isMicrotopicProgressStatus(
  v: string,
): v is MicrotopicProgressStatus {
  return (MICROTOPIC_STATUSES as readonly string[]).includes(v);
}

export const STATUS_LABEL: Record<MicrotopicProgressStatus, string> = {
  not_begun: "Not Begun",
  in_progress: "In Progress",
  completed: "Completed",
  need_revision: "Need Revision",
};

export type SyllabusMarksRow = {
  marks_2026?: number | null;
  marks_2025: number | null;
  marks_2024: number | null;
  marks_2023: number | null;
};

const MARKS_YEAR_ORDER = [2026, 2025, 2024, 2023] as const;

/** Marks weight for a syllabus row (prefer latest year; optional `skipYears` e.g. hide 2026 for NEET UG). */
export function syllabusMarksWeight(
  row: SyllabusMarksRow,
  skipYears?: readonly number[],
): number {
  const skip = new Set(skipYears ?? []);
  let picked: number | null | undefined;
  for (const y of MARKS_YEAR_ORDER) {
    if (skip.has(y)) continue;
    const v =
      y === 2026
        ? row.marks_2026
        : y === 2025
          ? row.marks_2025
          : y === 2024
            ? row.marks_2024
            : row.marks_2023;
    if (v != null) {
      picked = v;
      break;
    }
  }
  const w = picked ?? null;
  return w != null && w > 0 ? w : 1;
}

/** Positive marks for a specific exam year column, or 0 if unset. */
export function syllabusMarksWeightForYear(
  row: SyllabusMarksRow,
  year: number,
): number {
  let v: number | null = null;
  if (year === 2026) v = row.marks_2026 ?? null;
  else if (year === 2025) v = row.marks_2025;
  else if (year === 2024) v = row.marks_2024;
  else if (year === 2023) v = row.marks_2023;
  return v != null && v > 0 ? v : 0;
}
