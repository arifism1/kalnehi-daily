import type { MergedSyllabusRow } from "@/lib/userSyllabusMerge";

/** Upper bound on syllabus strings shipped to the Study Squad client bundle. */
export const STUDY_SQUAD_MAX_LABELS = 400;

const MAX_LINE_CHARS = 160;

/**
 * Build deduplicated display labels from merged syllabus rows (DB fields only).
 * Requires a non-empty microtopic; no invented topics.
 */
export function buildStudySquadLabelsFromRows(rows: MergedSyllabusRow[]): string[] {
  const seen = new Set<string>();

  for (const r of rows) {
    if (seen.size >= STUDY_SQUAD_MAX_LABELS) break;

    const subject = (r.subject ?? "").trim();
    const chapter = (r.chapter ?? "").trim();
    const microtopic = (r.microtopic ?? "").trim();

    if (!subject || !microtopic) continue;

    let line = chapter
      ? `${subject}: ${chapter} — ${microtopic}`
      : `${subject} — ${microtopic}`;

    if (line.length > MAX_LINE_CHARS) {
      line = `${line.slice(0, MAX_LINE_CHARS - 1)}…`;
    }
    seen.add(line);
  }

  return [...seen];
}
