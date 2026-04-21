/**
 * URLs that render full HTML for anonymous visitors (SEO / acquisition).
 * Must stay in sync with [`AppShell`](src/components/AppShell.tsx) and
 * [`isPaidAccessOverlayExemptPath`](src/lib/paid-access-exempt-paths.ts) for paid-access overlay rules.
 */
export const PUBLIC_MARKETING_PATHS = new Set<string>([
  "/",
  "/kalnehi-daily",
  "/guides",
  "/jee-study-planner",
  "/neet-study-planner",
  "/neet-pg-study-planner",
  "/cuet-ug-study-planner",
  "/upsc-study-planner",
  "/boards-study-planner",
  "/brain-yoga",
  "/what-can-kalnehi-do",
  "/best-study-practices",
]);

export function isPublicMarketingPath(pathname: string): boolean {
  if (PUBLIC_MARKETING_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/guides/")) return true;
  return false;
}
