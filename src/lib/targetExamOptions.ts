/**
 * @deprecated Profile and onboarding load options from the `exams` table
 * (`fetchExamsCatalog` / `EXAMS_CATALOG_FALLBACK`).
 * Kept for any legacy imports of exam name strings.
 */
export const PROFILE_TARGET_EXAM_OPTIONS = [
  "NEET UG",
  "NEET PG",
  "JEE Main",
  "JEE Advanced",
  "CUET",
  "CBSE Class 12",
  "CA Foundation",
  "UPSC CSE Prelims",
  "Other",
] as const;
