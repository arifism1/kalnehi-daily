/**
 * URLs that render full HTML for anonymous visitors (SEO / acquisition).
 * Must stay in sync with [`AppShell`](src/components/AppShell.tsx) gate logic.
 */
export const PUBLIC_MARKETING_PATHS = new Set<string>([
  "/guides",
  "/jee-study-planner",
  "/neet-study-planner",
  "/upsc-study-planner",
  "/boards-study-planner",
  "/brain-yoga",
]);

export function isPublicMarketingPath(pathname: string): boolean {
  if (PUBLIC_MARKETING_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/guides/")) return true;
  return false;
}
