import { normalizeSyllabusMasterId } from "@/lib/syllabusIds";
import type { SyllabusRow } from "@/lib/syllabusGrouping";

export type SyllabusMarksOverrideRow = {
  syllabus_master_id: string;
  marks_2025: number | null;
  marks_2024: number | null;
  marks_2023: number | null;
};

/**
 * Apply per-user marks overrides on top of catalog `syllabus_master` values.
 * `null` in an override column keeps the catalog value for that year.
 */
export function applyMarksOverridesToRows<T extends SyllabusRow>(
  rows: T[],
  overrides: SyllabusMarksOverrideRow[],
): T[] {
  const map = new Map(
    overrides.map((o) => [
      normalizeSyllabusMasterId(o.syllabus_master_id),
      o,
    ]),
  );
  return rows.map((r) => {
    const o = map.get(normalizeSyllabusMasterId(r.id));
    if (!o) return r;
    return {
      ...r,
      marks_2025: o.marks_2025 != null ? o.marks_2025 : r.marks_2025,
      marks_2024: o.marks_2024 != null ? o.marks_2024 : r.marks_2024,
      marks_2023: o.marks_2023 != null ? o.marks_2023 : r.marks_2023,
    };
  });
}
