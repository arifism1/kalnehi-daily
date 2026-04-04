/** Normalize exam labels from profile for routing syllabus UI. */
export function resolvePrimaryExam(profile: {
  primary_exam?: string | null;
  target_exam?: string | null;
} | null): string | null {
  const raw = profile?.primary_exam?.trim() || profile?.target_exam?.trim();
  return raw || null;
}

function normalizeExamLabel(exam: string): string {
  return exam.trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

/** Matches profile values like "JEE Main", "JEE MAINS", "jee mains". */
export function isJeeMainsExam(exam: string | null | undefined): boolean {
  if (!exam) return false;
  const n = normalizeExamLabel(exam);
  return n === "jee main" || n === "jee mains";
}

/** Matches "NEET UG" from the profile dropdown. */
export function isNeetUgExam(exam: string | null | undefined): boolean {
  if (!exam) return false;
  const n = normalizeExamLabel(exam);
  return n === "neet ug";
}
