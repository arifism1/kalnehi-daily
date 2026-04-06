/**
 * Canonical labels — must match `syllabus_master.subject` for CUET rows (case-insensitive match).
 */
export const CUET_DOMAIN_SUBJECT_OPTIONS = [
  "Accountancy",
  "Biology",
  "Business Studies",
  "Chemistry",
  "Economics",
  "English",
  "Geography",
  "History",
  "Mathematics",
  "Physics",
  "Political Science",
  "Psychology",
  "Sociology",
] as const;

export type CuetDomainSubjectOption = (typeof CUET_DOMAIN_SUBJECT_OPTIONS)[number];

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Parse JSONB from profile into a deduped list of subject strings. */
export function parseCuetDomainSubjectsJson(raw: unknown): string[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const t = item.trim();
    if (!t) continue;
    const k = norm(t);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/** Whether a syllabus row subject belongs to the user’s CUET domain selection. */
export function syllabusSubjectInCuetDomains(
  rowSubject: string | null | undefined,
  domainSubjects: string[],
): boolean {
  if (domainSubjects.length === 0) return false;
  const sub = norm(String(rowSubject ?? ""));
  const allowed = new Set(domainSubjects.map(norm));
  return allowed.has(sub);
}
