import { SITE_NAME } from "@/lib/seo-metadata";

/** Shared title + description for `/` and `/kalnehi-daily` (SEO + WebPage JSON-LD). */
export const LANDING_TITLE = `${SITE_NAME} — voice-first exam prep`;
export const LANDING_DESCRIPTION =
  "Voice-first exam prep: plan your day, track syllabus, log study time. Install as a PWA. Three days free, no card.";

export const LANDING_WEB_PAGE = {
  name: LANDING_TITLE,
  description: LANDING_DESCRIPTION,
} as const;
