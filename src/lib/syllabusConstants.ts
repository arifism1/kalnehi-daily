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
  marks_2025: number | null;
  marks_2024: number | null;
  marks_2023: number | null;
};

/** Marks weight for a syllabus row (prefer latest year). */
export function syllabusMarksWeight(row: SyllabusMarksRow): number {
  const w = row.marks_2025 ?? row.marks_2024 ?? row.marks_2023 ?? null;
  return w != null && w > 0 ? w : 1;
}

/** Positive marks for a specific exam year column, or 0 if unset. */
export function syllabusMarksWeightForYear(
  row: SyllabusMarksRow,
  year: number,
): number {
  let v: number | null = null;
  if (year === 2025) v = row.marks_2025;
  else if (year === 2024) v = row.marks_2024;
  else if (year === 2023) v = row.marks_2023;
  return v != null && v > 0 ? v : 0;
}
