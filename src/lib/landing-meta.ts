import { SITE_NAME } from "@/lib/seo-metadata";

/** Shared title + description for `/` and `/kalnehi-daily` (SEO + WebPage JSON-LD). */
export const LANDING_TITLE = `${SITE_NAME} — Win daily. Rank higher.`;
export const LANDING_DESCRIPTION =
  "Kalnehi Daily is the voice-controlled exam prep tracker for JEE, NEET, UPSC, and all major competitive exams. Dictate your daily plan, track your syllabus, and build the discipline that ranks you higher — all in one installable PWA. Start free, no card needed.";

export const LANDING_WEB_PAGE = {
  name: LANDING_TITLE,
  description: LANDING_DESCRIPTION,
} as const;
