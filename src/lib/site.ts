/**
 * Canonical site origin for metadata, JSON-LD, OG URLs, sitemaps, and redirects.
 * Set `NEXT_PUBLIC_SITE_URL` in production to `https://www.kalnehi.com`.
 *
 * SEO-related optional env vars:
 * - `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` — content value for the Google Search Console meta tag.
 * - `NEXT_PUBLIC_GA_MEASUREMENT_ID` — GA4 ID (G-…) for `GoogleAnalytics` + dataLayer events.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }
  return "http://localhost:3000";
}

/**
 * Single canonical origin for production URLs (e.g. JSON-LD breadcrumbs, RSS links).
 * Falls back to `getSiteUrl()` so it always tracks the configured host.
 */
export const SITE_URL = "https://www.kalnehi.com";

/**
 * Browser `Origin` values allowed for CSRF checks on cookie/session mutations
 * (Server Actions, selected API routes). Includes `SITE_URL`, `getSiteUrl()`,
 * localhost, and apex/www pair for kalnehi.com when either host appears.
 */
export function getTrustedBrowserOrigins(): string[] {
  const set = new Set<string>([
    SITE_URL.replace(/\/+$/, ""),
    "http://localhost:3000",
    "http://localhost:3001",
  ]);
  const primary = getSiteUrl().replace(/\/+$/, "");
  if (primary) set.add(primary);

  const addWwwApexKalnehiPair = (origin: string) => {
    try {
      const u = new URL(origin);
      if (u.protocol !== "http:" && u.protocol !== "https:") return;
      const host = u.hostname;
      if (host === "www.kalnehi.com") set.add("https://kalnehi.com");
      else if (host === "kalnehi.com") set.add("https://www.kalnehi.com");
    } catch {
      /* ignore invalid URL */
    }
  };
  addWwwApexKalnehiPair(SITE_URL);
  addWwwApexKalnehiPair(primary);

  return [...set];
}

/**
 * Base URL for all sitemap `loc` entries and the sitemap index.
 * Defaults to `getSiteUrl()` so canonical and sitemap hosts are always in sync.
 * Override with `SITEMAP_BASE_URL` / `NEXT_PUBLIC_SITEMAP_BASE_URL` only if you need
 * a diverging GSC property URL (not recommended — keep them the same).
 */
export function getSitemapBaseUrl(): string {
  const fromEnv =
    process.env.SITEMAP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITEMAP_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  return getSiteUrl();
}

/**
 * Absolute URL for sitemaps (uses the same host as all other canonical URLs).
 */
export function absoluteSitemapUrl(path: string): string {
  const base = getSitemapBaseUrl();
  if (!path || path === "/") return base;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/**
 * Absolute URL for production-only contexts (JSON-LD, RSS) — always follows
 * the configured canonical host rather than a hardcoded constant.
 */
export function absoluteProductionUrl(path: string): string {
  const base = getSiteUrl().replace(/\/+$/, "");
  if (!path || path === "/") return base;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export function getMetadataBase(): URL {
  return new URL(`${getSiteUrl()}/`);
}

export function absoluteUrl(path: string): string {
  const base = getSiteUrl();
  if (!path || path === "/") return base;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
