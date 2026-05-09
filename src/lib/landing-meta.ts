import { SITE_NAME } from "@/lib/seo-metadata";

/** Shared title + description for `/` and `/kalnehi-daily` (SEO + WebPage JSON-LD). */
export const LANDING_TITLE = `${SITE_NAME} — your exam prep operating system`;
export const LANDING_DESCRIPTION =
  "Plan execution, microtopic syllabus, and weightage-backed mark projections in one place. Voice-first daily planning, revision and backlog workflows, Mastermind coaching. Install as a PWA — 7-day free trial, no card.";

export const LANDING_WEB_PAGE = {
  name: LANDING_TITLE,
  description: LANDING_DESCRIPTION,
} as const;
