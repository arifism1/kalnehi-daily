/**
 * Default apex origin (JSON-LD on some tool pages, legacy absolute URLs).
 * Prefer `getSiteUrl()` for metadata; use `absoluteSitemapUrl()` for sitemap `loc` values.
 */
export const SITE_URL = "https://kalnehi.com";

/** GSC is registered on the www host; sitemap `loc` entries must match that property. */
const DEFAULT_SITEMAP_BASE_URL = "https://www.kalnehi.com";

/**
 * Base URL for all sitemap `loc` entries and the sitemap index. Override in production
 * with `SITEMAP_BASE_URL` or `NEXT_PUBLIC_SITEMAP_BASE_URL` if the canonical host changes.
 */
export function getSitemapBaseUrl(): string {
  const fromEnv =
    process.env.SITEMAP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITEMAP_BASE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  return DEFAULT_SITEMAP_BASE_URL;
}

/**
 * Absolute URL for sitemaps only (always the Search Console property host, default www).
 */
export function absoluteSitemapUrl(path: string): string {
  const base = getSitemapBaseUrl();
  if (!path || path === "/") return base;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/**
 * Absolute URL on a fixed non-preview host (tool page JSON-LD, RSS); uses apex `SITE_URL`.
 */
export function absoluteProductionUrl(path: string): string {
  const base = SITE_URL.replace(/\/+$/, "");
  if (!path || path === "/") return base;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/**
 * Canonical site origin for metadata, JSON-LD, and OG URLs.
 * Set `NEXT_PUBLIC_SITE_URL` in production (e.g. https://kalnehi.com).
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

export function getMetadataBase(): URL {
  return new URL(`${getSiteUrl()}/`);
}

export function absoluteUrl(path: string): string {
  const base = getSiteUrl();
  if (!path || path === "/") return base;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
