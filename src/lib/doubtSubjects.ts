/** Special subject option shown alongside syllabus subjects in Doubt Tracker. */
export const DOUBT_GENERAL_SUBJECT = "General";

export function normalizeStoredDoubtSubject(
  subject: string | null | undefined,
): string | undefined {
  const t = subject?.trim();
  return t ? t : undefined;
}
