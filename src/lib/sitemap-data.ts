import { getAllPosts } from "@/content/blog";
import { getSyllabusSlugs } from "@/content/syllabus";
import { absoluteSitemapUrl } from "@/lib/site";

export const revalidateSitemapSeconds = 86400;

const TOP_FIVE_EXAMS = new Set(["/jee", "/neet", "/upsc", "/cat", "/gate"]);

/** Exam landing paths only (sitemap-exams); planner/adjacent pages stay in sitemap-pages. */
export const EXAM_SITEMAP_PATHS: string[] = [
  "/jee",
  "/jee-main",
  "/jee-advanced",
  "/neet",
  "/neet-pg",
  "/upsc",
  "/upsc-prelims",
  "/upsc-mains",
  "/cat",
  "/gate",
  "/ca-foundation",
  "/ca-intermediate",
  "/ca-final",
  "/clat",
  "/nda",
  "/ssc-cgl",
  "/ssc-chsl",
  "/ibps-po",
  "/sbi-po",
  "/gre",
  "/sat",
  "/cuet",
  "/cbse-class-12",
  "/ipmat",
];

type ChangeFreq = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";

export type SitemapEntry = { path: string; priority: number; changeFrequency: ChangeFreq; lastMod?: Date };

const weekly: ChangeFreq = "weekly";
const monthly: ChangeFreq = "monthly";
const yearly: ChangeFreq = "yearly";

/**
 * Marketing URLs only for sitemap-pages.xml (public, searchable, not behind paywall/auth).
 * Excludes app-only URLs (e.g., /planner/*, /dashboard/*, /settings).
 * These paths MUST be allowed by robots.txt.
 */
const MARKETING_SITEMAP: SitemapEntry[] = [
  { path: "/", priority: 1, changeFrequency: weekly },
  { path: "/blog", priority: 0.85, changeFrequency: weekly },
  { path: "/pricing", priority: 0.9, changeFrequency: weekly },
  { path: "/what-can-kalnehi-do", priority: 0.95, changeFrequency: weekly },
  { path: "/best-study-practices", priority: 0.95, changeFrequency: monthly },
  { path: "/guides", priority: 0.95, changeFrequency: weekly },
  { path: "/guides/how-to-maintain-consistency-in-jee-preparation", priority: 0.9, changeFrequency: monthly },
  { path: "/guides/daily-exam-prep-system-any-exam", priority: 0.9, changeFrequency: monthly },
  { path: "/features", priority: 0.9, changeFrequency: weekly },
  { path: "/features/prepbrain-ai", priority: 0.8, changeFrequency: weekly },
  { path: "/features/voice-control", priority: 0.8, changeFrequency: weekly },
  { path: "/features/syllabus-tracker", priority: 0.8, changeFrequency: weekly },
  { path: "/features/spaced-revision", priority: 0.8, changeFrequency: weekly },
  { path: "/features/marks-engine", priority: 0.8, changeFrequency: weekly },
  { path: "/features/study-timer", priority: 0.8, changeFrequency: weekly },
  { path: "/features/consistency-tracker", priority: 0.8, changeFrequency: weekly },
  { path: "/features/doubt-tracker", priority: 0.8, changeFrequency: weekly },
  { path: "/features/daily-planner", priority: 0.8, changeFrequency: weekly },
  { path: "/features/on-camera-study", priority: 0.8, changeFrequency: weekly },
  { path: "/features/habit-maker", priority: 0.8, changeFrequency: weekly },
  { path: "/features/daily-log", priority: 0.8, changeFrequency: weekly },
  { path: "/search", priority: 0.5, changeFrequency: weekly },
  { path: "/vs", priority: 0.75, changeFrequency: monthly },
  { path: "/vs/notion", priority: 0.7, changeFrequency: monthly },
  { path: "/vs/google-calendar", priority: 0.7, changeFrequency: monthly },
  { path: "/vs/physical-timetable", priority: 0.7, changeFrequency: monthly },
  { path: "/vs/excel-study-planner", priority: 0.7, changeFrequency: monthly },
  { path: "/vs/todoist", priority: 0.7, changeFrequency: monthly },
  { path: "/for/jee-droppers", priority: 0.7, changeFrequency: monthly },
  { path: "/for/neet-droppers", priority: 0.7, changeFrequency: monthly },
  { path: "/for/class-11-students", priority: 0.7, changeFrequency: monthly },
  { path: "/for/class-12-students", priority: 0.7, changeFrequency: monthly },
  { path: "/for/upsc-working-professionals", priority: 0.7, changeFrequency: monthly },
  { path: "/for/ca-students", priority: 0.7, changeFrequency: monthly },
  { path: "/for/engineering-students-gate", priority: 0.7, changeFrequency: monthly },
  { path: "/tools", priority: 0.8, changeFrequency: monthly },
  { path: "/tools/study-hours-calculator", priority: 0.8, changeFrequency: monthly },
  { path: "/tools/exam-countdown", priority: 0.8, changeFrequency: monthly },
  { path: "/tools/revision-scheduler", priority: 0.8, changeFrequency: monthly },
  { path: "/about", priority: 0.6, changeFrequency: monthly },
  { path: "/contact", priority: 0.6, changeFrequency: monthly },
  { path: "/changelog", priority: 0.6, changeFrequency: weekly },
  { path: "/privacy", priority: 0.5, changeFrequency: monthly },
  { path: "/terms", priority: 0.5, changeFrequency: monthly },
  { path: "/refund", priority: 0.4, changeFrequency: yearly },
  { path: "/return", priority: 0.4, changeFrequency: yearly },
  { path: "/shipping", priority: 0.4, changeFrequency: yearly },
  { path: "/policies", priority: 0.5, changeFrequency: yearly },
  { path: "/kalnehi-daily", priority: 0.6, changeFrequency: monthly },
  ...getSyllabusSlugs().map(
    (slug): SitemapEntry => ({
      path: `/syllabus/${slug}`,
      priority: 0.7,
      changeFrequency: monthly,
    }),
  ),
];

/**
 * App-only URLs excluded from public sitemap (behind auth, paywall, or dynamic).
 * These are intentionally NOT in sitemaps because robots.txt disallows them.
 *
 * KEPT FOR REFERENCE: in case you want to build a separate internal sitemap:
 * /daily-plan, /planner/*, /meditation/*, /my-subscription, /settings,
 * /target-score-blueprint, /my-target, /saved-plans, /study-sessions, /prepbrain,
 * /marks-engine, /daily-engine, /revision-tracker, /progress, /heatmap,
 * /calendar, /consistency-tracker, /habits, /timer, /motivation, /notifications,
 * /feedback, /doubts, /profile, /onboarding, /dictate-day, /self-type*
 */

const PAGES_SITEMAP = MARKETING_SITEMAP;

export function getPagesSitemapEntries(): SitemapEntry[] {
  return PAGES_SITEMAP;
}

export function getExamSitemapEntries(): SitemapEntry[] {
  const now = new Date();
  return EXAM_SITEMAP_PATHS.map((path) => ({
    path,
    priority: TOP_FIVE_EXAMS.has(path) ? 0.9 : 0.8,
    changeFrequency: weekly,
    lastMod: now,
  }));
}

function blogPriority(published: Date): number {
  const now = Date.now();
  const d = (now - published.getTime()) / 86400000;
  if (d <= 30) return 0.7;
  if (d <= 90) return 0.6;
  return 0.5;
}

/** Post URLs only; `/blog` is listed in sitemap-pages.xml. */
export function getBlogSitemapEntries(): SitemapEntry[] {
  const posts = getAllPosts();
  return posts.map((p) => {
    const published = new Date(p.publishedAt);
    const mod = p.modifiedAt ? new Date(p.modifiedAt) : published;
    return {
      path: `/blog/${p.slug}`,
      priority: blogPriority(published),
      changeFrequency: monthly,
      lastMod: mod,
    };
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildUrlsetXml(
  entries: SitemapEntry[],
  defaultLastMod: Date,
): string {
  const body = entries
    .map((e) => {
      const loc = absoluteSitemapUrl(e.path);
      const last = (e.lastMod ?? defaultLastMod).toISOString();
      return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${last}</lastmod>
    <changefreq>${e.changeFrequency}</changefreq>
    <priority>${e.priority}</priority>
  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>`;
}

export function buildSitemapIndexXml(): string {
  const l1 = absoluteSitemapUrl("/sitemap-pages.xml");
  const l2 = absoluteSitemapUrl("/sitemap-blog.xml");
  const l3 = absoluteSitemapUrl("/sitemap-exams.xml");
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${escapeXml(l1)}</loc>
  </sitemap>
  <sitemap>
    <loc>${escapeXml(l2)}</loc>
  </sitemap>
  <sitemap>
    <loc>${escapeXml(l3)}</loc>
  </sitemap>
</sitemapindex>`;
}

export function sitemapIndexResponse(): Response {
  return new Response(buildSitemapIndexXml(), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": `public, s-maxage=${revalidateSitemapSeconds}, stale-while-revalidate=86400`,
    },
  });
}

export function urlsetResponse(entries: SitemapEntry[]): Response {
  const defaultLastMod = new Date();
  return new Response(buildUrlsetXml(entries, defaultLastMod), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": `public, s-maxage=${revalidateSitemapSeconds}, stale-while-revalidate=86400`,
    },
  });
}
