import { SITE_NAME } from "@/lib/seo-metadata";

/** Shared title + description for `/` and `/kalnehi-daily` (SEO + WebPage JSON-LD). */
export const LANDING_TITLE = `${SITE_NAME} — Win daily. Rank higher.`;
export const LANDING_DESCRIPTION =
  "Kalnehi Daily is the exam-prep execution app for Indian and international competitive exams. Daily plan, syllabus tracker, focus timer, revision reminders, and PrepBrain AI — all in one installable PWA. Start free, no card needed.";

export const LANDING_WEB_PAGE = {
  name: LANDING_TITLE,
  description: LANDING_DESCRIPTION,
} as const;
