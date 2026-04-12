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
