import type { MetadataRoute } from "next";

import { absoluteProductionUrl } from "@/lib/site";

/** Regenerate periodically so `lastModified` stays plausible without per-route CMS dates. */
export const revalidate = 86400;

type ChangeFreq = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

type SitemapPath = {
  path: string;
  changeFrequency: ChangeFreq;
  priority: number;
  /**
   * When true, `lastModified` is set with a fresh `Date()` at sitemap generation time
   * so this URL’s lastmod reflects “today” on each regen (see `revalidate`).
   */
  spotlightLastModified?: boolean;
};

/**
 * Public marketing + SEO landing pages (crawlable without sign-in).
 * Highest priority after home.
 */
const PUBLIC_MARKETING: SitemapPath[] = [
  {
    path: "/best-study-practices",
    changeFrequency: "monthly",
    priority: 0.95,
    spotlightLastModified: true,
  },
  { path: "/guides", changeFrequency: "weekly", priority: 0.95 },
  {
    path: "/guides/how-to-maintain-consistency-in-jee-preparation",
    changeFrequency: "monthly",
    priority: 0.9,
  },
  {
    path: "/guides/daily-exam-prep-system-any-exam",
    changeFrequency: "monthly",
    priority: 0.9,
  },
  { path: "/jee-study-planner", changeFrequency: "weekly", priority: 0.95 },
  { path: "/neet-study-planner", changeFrequency: "weekly", priority: 0.95 },
  { path: "/neet-pg-study-planner", changeFrequency: "weekly", priority: 0.92 },
  { path: "/cuet-ug-study-planner", changeFrequency: "weekly", priority: 0.92 },
  { path: "/upsc-study-planner", changeFrequency: "weekly", priority: 0.95 },
  { path: "/boards-study-planner", changeFrequency: "weekly", priority: 0.92 },
  { path: "/brain-yoga", changeFrequency: "weekly", priority: 0.95 },
];

/** Policy and company pages (see `LEGAL_PATHS` + about). */
const PUBLIC_LEGAL_AND_ABOUT: SitemapPath[] = [
  { path: "/about", changeFrequency: "monthly", priority: 0.88 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.45 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.45 },
  { path: "/refund", changeFrequency: "yearly", priority: 0.4 },
  { path: "/return", changeFrequency: "yearly", priority: 0.4 },
  { path: "/shipping", changeFrequency: "yearly", priority: 0.4 },
  { path: "/policies", changeFrequency: "yearly", priority: 0.45 },
];

/**
 * Authenticated app routes (`ProtectedLayout`). Listed for discovery; crawlers
 * typically see sign-in. No per-user URLs — never add profile IDs or PII slugs.
 */
const APP_PRIORITY_FEATURES: SitemapPath[] = [
  { path: "/daily-plan", changeFrequency: "daily", priority: 0.8 },
  { path: "/syllabus", changeFrequency: "weekly", priority: 0.8 },
  { path: "/meditation", changeFrequency: "weekly", priority: 0.8 },
  { path: "/meditation/consistency", changeFrequency: "weekly", priority: 0.75 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.8 },
  { path: "/my-plan", changeFrequency: "weekly", priority: 0.78 },
  { path: "/settings", changeFrequency: "monthly", priority: 0.75 },
];

const APP_PLANNER_AND_STUDY: SitemapPath[] = [
  { path: "/planner", changeFrequency: "weekly", priority: 0.75 },
  { path: "/planner/schedule", changeFrequency: "weekly", priority: 0.72 },
  { path: "/planner/todos", changeFrequency: "weekly", priority: 0.72 },
  { path: "/planner/weekly", changeFrequency: "weekly", priority: 0.72 },
  { path: "/planner/routine", changeFrequency: "weekly", priority: 0.72 },
  { path: "/planner/habits", changeFrequency: "weekly", priority: 0.72 },
  { path: "/planner/productivity", changeFrequency: "weekly", priority: 0.7 },
  { path: "/plan-my-day", changeFrequency: "weekly", priority: 0.72 },
  { path: "/plan", changeFrequency: "weekly", priority: 0.72 },
  { path: "/study-sessions", changeFrequency: "weekly", priority: 0.75 },
  { path: "/prepbrain", changeFrequency: "weekly", priority: 0.76 },
  { path: "/marks-engine", changeFrequency: "weekly", priority: 0.72 },
  { path: "/daily-engine", changeFrequency: "weekly", priority: 0.72 },
  { path: "/revision", changeFrequency: "weekly", priority: 0.72 },
  { path: "/daily-log", changeFrequency: "weekly", priority: 0.7 },
];

const APP_PROGRESS_AND_TOOLS: SitemapPath[] = [
  { path: "/progress", changeFrequency: "weekly", priority: 0.74 },
  { path: "/heatmap", changeFrequency: "weekly", priority: 0.7 },
  { path: "/calendar", changeFrequency: "weekly", priority: 0.7 },
  { path: "/consistency-tracker", changeFrequency: "weekly", priority: 0.7 },
  { path: "/habits", changeFrequency: "weekly", priority: 0.72 },
  { path: "/timer", changeFrequency: "weekly", priority: 0.7 },
  { path: "/motivation", changeFrequency: "weekly", priority: 0.68 },
  { path: "/notifications", changeFrequency: "monthly", priority: 0.65 },
  { path: "/feedback", changeFrequency: "monthly", priority: 0.65 },
  { path: "/doubts", changeFrequency: "weekly", priority: 0.68 },
];

const APP_CAPTURE_AND_ONBOARDING: SitemapPath[] = [
  /** Account hub only — never add `/profile/[id]`-style URLs. */
  { path: "/profile", changeFrequency: "monthly", priority: 0.65 },
  { path: "/onboarding", changeFrequency: "monthly", priority: 0.65 },
  { path: "/study-camera", changeFrequency: "monthly", priority: 0.65 },
  { path: "/paste-handwritten", changeFrequency: "monthly", priority: 0.65 },
  { path: "/dictate-day", changeFrequency: "monthly", priority: 0.65 },
  { path: "/self-type", changeFrequency: "monthly", priority: 0.65 },
  { path: "/self-type-day", changeFrequency: "monthly", priority: 0.65 },
];

const PATHS: SitemapPath[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  {
    path: "/what-can-kalnehi-do",
    changeFrequency: "weekly",
    priority: 1,
    spotlightLastModified: true,
  },
  ...PUBLIC_MARKETING,
  ...PUBLIC_LEGAL_AND_ABOUT,
  ...APP_PRIORITY_FEATURES,
  ...APP_PLANNER_AND_STUDY,
  ...APP_PROGRESS_AND_TOOLS,
  ...APP_CAPTURE_AND_ONBOARDING,
];

export default function sitemap(): MetadataRoute.Sitemap {
  const batchLastModified = new Date();
  return PATHS.map(({ path, changeFrequency, priority, spotlightLastModified }) => ({
    url: absoluteProductionUrl(path),
    lastModified: spotlightLastModified ? new Date() : batchLastModified,
    changeFrequency,
    priority,
  }));
}
