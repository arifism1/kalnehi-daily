import { fizakiConfig } from "@/verticals/fizaki.config";

/** Shared title + description for FIZAKI `/` (SEO + WebPage JSON-LD). */
export const FIZAKI_LANDING_TITLE = `${fizakiConfig.brand.productName} — turn enablement into revenue`;
export const FIZAKI_LANDING_DESCRIPTION =
  "Voice-first daily practice, playbook reinforcement, post-call debrief, and a manager dashboard that proves ramp time and quota attainment — not another LMS.";

export const FIZAKI_LANDING_WEB_PAGE = {
  name: FIZAKI_LANDING_TITLE,
  description: FIZAKI_LANDING_DESCRIPTION,
} as const;
