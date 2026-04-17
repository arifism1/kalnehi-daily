/** Special subject option shown alongside syllabus subjects in Doubt Tracker. */
export const DOUBT_GENERAL_SUBJECT = "General";

export function normalizeStoredDoubtSubject(
  subject: string | null | undefined,
): string | undefined {
  const t = subject?.trim();
  return t ? t : undefined;
}

export function normalizeStoredDoubtTopic(
  topic: string | null | undefined,
): string | undefined {
  const t = topic?.trim();
  return t ? t : undefined;
}

function normSubjectKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Maps a model-suggested subject onto a canonical syllabus label (exact or
 * case/whitespace-insensitive). Returns "" when no match.
 */
export function resolveSubjectAgainstCatalog(
  suggested: string | null | undefined,
  catalog: readonly string[],
): string {
  const t = typeof suggested === "string" ? suggested.trim() : "";
  if (!t) return "";
  if (catalog.includes(t)) return t;
  const n = normSubjectKey(t);
  for (const c of catalog) {
    if (normSubjectKey(c) === n) return c;
  }
  return "";
}
