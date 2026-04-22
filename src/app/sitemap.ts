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
   * so this URL's lastmod reflects "today" on each regen (see `revalidate`).
   */
  spotlightLastModified?: boolean;
};

/** Core pages — highest priority */
const CORE: SitemapPath[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.98 },
  { path: "/what-can-kalnehi-do", changeFrequency: "weekly", priority: 1, spotlightLastModified: true },
];

/**
 * Public marketing + SEO landing pages (crawlable without sign-in).
 * Highest priority after home.
 */
const PUBLIC_MARKETING: SitemapPath[] = [
  { path: "/best-study-practices", changeFrequency: "monthly", priority: 0.95, spotlightLastModified: true },
  { path: "/guides", changeFrequency: "weekly", priority: 0.95 },
  { path: "/guides/how-to-maintain-consistency-in-jee-preparation", changeFrequency: "monthly", priority: 0.9 },
  { path: "/guides/daily-exam-prep-system-any-exam", changeFrequency: "monthly", priority: 0.9 },
  { path: "/jee-study-planner", changeFrequency: "weekly", priority: 0.95 },
  { path: "/neet-study-planner", changeFrequency: "weekly", priority: 0.95 },
  { path: "/neet-pg-study-planner", changeFrequency: "weekly", priority: 0.92 },
  { path: "/cuet-ug-study-planner", changeFrequency: "weekly", priority: 0.92 },
  { path: "/upsc-study-planner", changeFrequency: "weekly", priority: 0.95 },
  { path: "/boards-study-planner", changeFrequency: "weekly", priority: 0.92 },
  { path: "/brain-yoga", changeFrequency: "weekly", priority: 0.95 },
];

/** New comprehensive exam landing pages */
const EXAM_PAGES: SitemapPath[] = [
  { path: "/jee", changeFrequency: "weekly", priority: 0.97 },
  { path: "/jee-main", changeFrequency: "weekly", priority: 0.95 },
  { path: "/jee-advanced", changeFrequency: "weekly", priority: 0.95 },
  { path: "/neet", changeFrequency: "weekly", priority: 0.97 },
  { path: "/neet-pg", changeFrequency: "weekly", priority: 0.93 },
  { path: "/upsc", changeFrequency: "weekly", priority: 0.97 },
  { path: "/upsc-prelims", changeFrequency: "weekly", priority: 0.94 },
  { path: "/upsc-mains", changeFrequency: "weekly", priority: 0.94 },
  { path: "/cat", changeFrequency: "weekly", priority: 0.95 },
  { path: "/gate", changeFrequency: "weekly", priority: 0.95 },
  { path: "/ca-foundation", changeFrequency: "weekly", priority: 0.93 },
  { path: "/ca-intermediate", changeFrequency: "weekly", priority: 0.93 },
  { path: "/ca-final", changeFrequency: "weekly", priority: 0.93 },
  { path: "/clat", changeFrequency: "weekly", priority: 0.92 },
  { path: "/nda", changeFrequency: "weekly", priority: 0.91 },
  { path: "/ssc-cgl", changeFrequency: "weekly", priority: 0.93 },
  { path: "/ssc-chsl", changeFrequency: "weekly", priority: 0.91 },
  { path: "/ibps-po", changeFrequency: "weekly", priority: 0.92 },
  { path: "/sbi-po", changeFrequency: "weekly", priority: 0.92 },
  { path: "/gre", changeFrequency: "weekly", priority: 0.90 },
  { path: "/sat", changeFrequency: "weekly", priority: 0.90 },
  { path: "/cuet", changeFrequency: "weekly", priority: 0.92 },
  { path: "/cbse-class-12", changeFrequency: "weekly", priority: 0.92 },
  { path: "/ipmat", changeFrequency: "weekly", priority: 0.90 },
];

/** Feature pages */
const FEATURE_PAGES: SitemapPath[] = [
  { path: "/features", changeFrequency: "monthly", priority: 0.93 },
  { path: "/features/prepbrain-ai", changeFrequency: "monthly", priority: 0.92 },
  { path: "/features/voice-control", changeFrequency: "monthly", priority: 0.91 },
  { path: "/features/syllabus-tracker", changeFrequency: "monthly", priority: 0.91 },
  { path: "/features/spaced-revision", changeFrequency: "monthly", priority: 0.90 },
  { path: "/features/marks-engine", changeFrequency: "monthly", priority: 0.90 },
  { path: "/features/study-timer", changeFrequency: "monthly", priority: 0.88 },
  { path: "/features/consistency-tracker", changeFrequency: "monthly", priority: 0.88 },
  { path: "/features/doubt-tracker", changeFrequency: "monthly", priority: 0.88 },
  { path: "/features/daily-planner", changeFrequency: "monthly", priority: 0.90 },
  { path: "/features/on-camera-study", changeFrequency: "monthly", priority: 0.87 },
  { path: "/features/habit-maker", changeFrequency: "monthly", priority: 0.87 },
  { path: "/features/daily-log", changeFrequency: "monthly", priority: 0.87 },
];

/** Blog index + individual posts */
const BLOG_PAGES: SitemapPath[] = [
  { path: "/blog", changeFrequency: "weekly", priority: 0.90 },
  { path: "/blog/how-to-make-daily-study-timetable-jee", changeFrequency: "monthly", priority: 0.85, spotlightLastModified: true },
  { path: "/blog/how-many-hours-neet-aspirant-study", changeFrequency: "monthly", priority: 0.85, spotlightLastModified: true },
  { path: "/blog/upsc-consistency-more-important-than-hours", changeFrequency: "monthly", priority: 0.85, spotlightLastModified: true },
  { path: "/blog/spaced-repetition-competitive-exams-india", changeFrequency: "monthly", priority: 0.84, spotlightLastModified: true },
  { path: "/blog/how-toppers-track-syllabus", changeFrequency: "monthly", priority: 0.84, spotlightLastModified: true },
  { path: "/blog/jee-dropper-study-plan", changeFrequency: "monthly", priority: 0.85, spotlightLastModified: true },
  { path: "/blog/voice-study-planning-why-it-works", changeFrequency: "monthly", priority: 0.83, spotlightLastModified: true },
  { path: "/blog/ca-intermediate-daily-routine", changeFrequency: "monthly", priority: 0.83, spotlightLastModified: true },
  { path: "/blog/upsc-daily-study-routine", changeFrequency: "monthly", priority: 0.84, spotlightLastModified: true },
  { path: "/blog/neet-syllabus-tracker-strategy", changeFrequency: "monthly", priority: 0.84, spotlightLastModified: true },
  { path: "/blog/gate-preparation-daily-plan", changeFrequency: "monthly", priority: 0.83, spotlightLastModified: true },
  { path: "/blog/study-consistency-vs-long-hours", changeFrequency: "monthly", priority: 0.84, spotlightLastModified: true },
  { path: "/blog/ai-study-planner-india", changeFrequency: "monthly", priority: 0.84, spotlightLastModified: true },
  { path: "/blog/doubt-tracking-system-exam-prep", changeFrequency: "monthly", priority: 0.83, spotlightLastModified: true },
  { path: "/blog/class-12-boards-jee-neet-balance", changeFrequency: "monthly", priority: 0.84, spotlightLastModified: true },
  // Category pages
  { path: "/blog/category/jee-preparation", changeFrequency: "weekly", priority: 0.80 },
  { path: "/blog/category/neet-preparation", changeFrequency: "weekly", priority: 0.80 },
  { path: "/blog/category/upsc-preparation", changeFrequency: "weekly", priority: 0.80 },
  { path: "/blog/category/study-techniques", changeFrequency: "weekly", priority: 0.80 },
  { path: "/blog/category/ca-preparation", changeFrequency: "weekly", priority: 0.78 },
  { path: "/blog/category/gate-preparation", changeFrequency: "weekly", priority: 0.78 },
];

/** Comparison pages */
const COMPARISON_PAGES: SitemapPath[] = [
  { path: "/vs/notion", changeFrequency: "monthly", priority: 0.85 },
  { path: "/vs/google-calendar", changeFrequency: "monthly", priority: 0.84 },
  { path: "/vs/physical-timetable", changeFrequency: "monthly", priority: 0.83 },
  { path: "/vs/excel-study-planner", changeFrequency: "monthly", priority: 0.83 },
  { path: "/vs/todoist", changeFrequency: "monthly", priority: 0.82 },
];

/** Use case pages */
const USE_CASE_PAGES: SitemapPath[] = [
  { path: "/for/jee-droppers", changeFrequency: "monthly", priority: 0.88 },
  { path: "/for/neet-droppers", changeFrequency: "monthly", priority: 0.88 },
  { path: "/for/class-11-students", changeFrequency: "monthly", priority: 0.86 },
  { path: "/for/class-12-students", changeFrequency: "monthly", priority: 0.87 },
  { path: "/for/upsc-working-professionals", changeFrequency: "monthly", priority: 0.87 },
  { path: "/for/ca-students", changeFrequency: "monthly", priority: 0.85 },
  { path: "/for/engineering-students-gate", changeFrequency: "monthly", priority: 0.85 },
];

/** Free tools */
const TOOL_PAGES: SitemapPath[] = [
  { path: "/tools", changeFrequency: "monthly", priority: 0.88 },
  { path: "/tools/study-hours-calculator", changeFrequency: "monthly", priority: 0.86 },
  { path: "/tools/exam-countdown", changeFrequency: "monthly", priority: 0.85 },
  { path: "/tools/revision-scheduler", changeFrequency: "monthly", priority: 0.85 },
];

/** Syllabus pages */
const SYLLABUS_PAGES: SitemapPath[] = [
  { path: "/syllabus/jee-main", changeFrequency: "monthly", priority: 0.88 },
  { path: "/syllabus/jee-advanced", changeFrequency: "monthly", priority: 0.87 },
  { path: "/syllabus/neet-ug", changeFrequency: "monthly", priority: 0.88 },
  { path: "/syllabus/upsc-cse", changeFrequency: "monthly", priority: 0.88 },
  { path: "/syllabus/cat", changeFrequency: "monthly", priority: 0.85 },
  { path: "/syllabus/gate-cse", changeFrequency: "monthly", priority: 0.85 },
  { path: "/syllabus/gate-ece", changeFrequency: "monthly", priority: 0.84 },
  { path: "/syllabus/ca-foundation", changeFrequency: "monthly", priority: 0.85 },
  { path: "/syllabus/ca-intermediate", changeFrequency: "monthly", priority: 0.85 },
];

/** Policy and company pages (see `LEGAL_PATHS` + about). */
const PUBLIC_LEGAL_AND_ABOUT: SitemapPath[] = [
  { path: "/about", changeFrequency: "monthly", priority: 0.88 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.80 },
  { path: "/changelog", changeFrequency: "weekly", priority: 0.82 },
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
  { path: "/my-subscription", changeFrequency: "weekly", priority: 0.78 },
  { path: "/settings", changeFrequency: "monthly", priority: 0.75 },
  { path: "/target-score-blueprint", changeFrequency: "weekly", priority: 0.76 },
  { path: "/my-target", changeFrequency: "weekly", priority: 0.72 },
  { path: "/saved-plans", changeFrequency: "weekly", priority: 0.72 },
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
  { path: "/revision-engine", changeFrequency: "weekly", priority: 0.72 },
  { path: "/revision-reminders", changeFrequency: "weekly", priority: 0.7 },
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
  { path: "/profile", changeFrequency: "monthly", priority: 0.65 },
  { path: "/onboarding", changeFrequency: "monthly", priority: 0.65 },
  { path: "/dictate-day", changeFrequency: "monthly", priority: 0.65 },
  { path: "/self-type", changeFrequency: "monthly", priority: 0.65 },
  { path: "/self-type-day", changeFrequency: "monthly", priority: 0.65 },
];

const PATHS: SitemapPath[] = [
  ...CORE,
  ...PUBLIC_MARKETING,
  ...EXAM_PAGES,
  ...FEATURE_PAGES,
  ...BLOG_PAGES,
  ...COMPARISON_PAGES,
  ...USE_CASE_PAGES,
  ...TOOL_PAGES,
  ...SYLLABUS_PAGES,
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
