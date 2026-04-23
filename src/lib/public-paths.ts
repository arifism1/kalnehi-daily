/**
 * URLs that render full HTML for anonymous visitors (SEO / acquisition).
 * Must stay in sync with [`AppShell`](src/components/AppShell.tsx) and
 * [`isPaidAccessOverlayExemptPath`](src/lib/paid-access-exempt-paths.ts) for paid-access overlay rules.
 */
export const PUBLIC_MARKETING_PATHS = new Set<string>([
  "/",
  "/kalnehi-daily",
  "/pricing",
  "/guides",
  "/about",
  "/contact",
  "/changelog",
  // Existing exam study planner pages
  "/jee-study-planner",
  "/neet-study-planner",
  "/neet-pg-study-planner",
  "/cuet-ug-study-planner",
  "/upsc-study-planner",
  "/boards-study-planner",
  "/brain-yoga",
  "/what-can-kalnehi-do",
  "/best-study-practices",
  // New exam landing pages
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
  // Feature master page
  "/features",
  // Tools master page
  "/tools",
  // Waitlist pages (accessible without auth)
  "/waitlist",
  "/waitlist/position",
]);

/** Prefix patterns for route families that are always public. */
const PUBLIC_PREFIXES = [
  "/guides/",
  "/blog/",
  "/blog",
  "/features/",
  "/vs/",
  "/for/",
  "/tools/",
  "/syllabus/",
];

export function isPublicMarketingPath(pathname: string): boolean {
  if (PUBLIC_MARKETING_PATHS.has(pathname)) return true;
  for (const prefix of PUBLIC_PREFIXES) {
    if (pathname.startsWith(prefix)) return true;
  }
  return false;
}
