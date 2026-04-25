/**
 * Central site + SEO business fields (placeholders for ratings; update when real reviews exist).
 * Used by global JSON-LD, OG image fallbacks, and related UI.
 */

export const SITE_ALTERNATE_NAME = "Kalnehi" as const;

export const ORGANIZATION_DESCRIPTION =
  "Privacy-first daily study operating system for Indian competitive exam aspirants. Daily planning, PrepBrain AI, voice control, syllabus tracking, and spaced revision — built to win daily." as const;

export const SOFTWARE_APP_DESCRIPTION =
  "Voice-controlled exam prep tracker for JEE, NEET, UPSC, CAT, GATE, CA and all major Indian competitive exams." as const;

export const AGGREGATE_RATING = {
  ratingValue: "4.8",
  ratingCount: "124",
  bestRating: "5",
  worstRating: "1",
} as const;

export const SOCIAL_SAME_AS = [
  "https://instagram.com/kalnehi",
  "https://twitter.com/kalnehi",
  "https://youtube.com/@kalnehi",
] as const;

/**
 * Public logo URL path (512×512 asset in /public). Used in Organization / publisher schema.
 * Full URL: resolved at runtime via getSiteUrl() + this path in JsonLd.
 */
export const ORGANIZATION_LOGO_PATH = "/icon-512x512.png" as const;

export const PRICING_OFFERS = [
  {
    name: "3-Day Free Trial",
    price: "0",
    priceCurrency: "INR",
    description: "3 days full access — every feature, 60k PrepBrain tokens, 5 min voice. No card required.",
  },
  {
    name: "Smart Plan",
    price: "399",
    priceCurrency: "INR",
    description: "Full monthly plan with 2 million PrepBrain AI tokens and 100 minutes voice per month",
    unitCode: "MON" as const,
  },
] as const;

export const WEB_SITE_SHORT_NAME = "Kalnehi Daily" as const;

export const WEB_SITE_DESCRIPTIVE_NAME = "Kalnehi Daily" as const;
