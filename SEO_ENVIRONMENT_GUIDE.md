# SEO & Google Search Console Environment Guide

**Last Updated:** May 10, 2026

## Current Environment State

### Local Development (`.env` / `.env.local`)

If you do **not** set:

- `NEXT_PUBLIC_SITE_URL`
- `SITEMAP_BASE_URL`
- `NEXT_PUBLIC_SITEMAP_BASE_URL`

then **metadata and sitemap hosts fall back from env** as implemented in [`src/lib/site.ts`](src/lib/site.ts): `getSiteUrl()` uses `VERCEL_URL` on Vercel previews or `http://localhost:3000` locally; `getSitemapBaseUrl()` uses `SITEMAP_BASE_URL` / `NEXT_PUBLIC_SITEMAP_BASE_URL` if set, otherwise **the same value as** `getSiteUrl()`.

### Sitemaps & Canonicals — Default Behavior

| Component | Current Behavior | Code Reference |
|-----------|-----------------|-----------------|
| **Sitemap `<loc>` URLs** | `getSitemapBaseUrl()` from [`src/lib/site.ts`](src/lib/site.ts) — optional `SITEMAP_BASE_URL` / `NEXT_PUBLIC_SITEMAP_BASE_URL`, else same as `getSiteUrl()` | `getSitemapBaseUrl()` (≈ lines 32–38) |
| **Canonical `<link>` & `og:url`** | `getSiteUrl()` — `NEXT_PUBLIC_SITE_URL` if set, else `https://${VERCEL_URL}`, else localhost | `getSiteUrl()` (≈ lines 9–18) |
| **Live apex → www redirect** | Any request whose host is **`kalnehi.com`** is permanently redirected to **`https://www.kalnehi.com/:path*`** | [`next.config.ts`](next.config.ts) `redirects()` |

There is **no** host redirect in [`src/proxy.ts`](src/proxy.ts) for apex/www; SEO hostname policy is enforced in **Next config**, not the proxy.

### In Production (Vercel)

**You must explicitly set environment variables** in the Vercel dashboard or via `vercel env` CLI:

1. **`NEXT_PUBLIC_SITE_URL`** — Canonical origin emitted in metadata (recommended: **`https://www.kalnehi.com`** to match the apex→www redirect below)
   - Used for page `<link rel="canonical">` and related absolute URLs
   - Visible to the browser/Googlebot

2. **`SITEMAP_BASE_URL`** (optional) — Override base URL for sitemap `<loc>` entries only
   - Prefer **the same host** as `NEXT_PUBLIC_SITE_URL` so canonicals and sitemaps stay aligned
   - If unset, sitemaps use `getSiteUrl()` (see `getSitemapBaseUrl()`)

## Recommended Production Configuration

### Preferred: www (matches `next.config.ts` redirect)

The app **`permanently redirects apex → www`**. Browsers and Googlebot end up on **`www`**. Align env and Search Console with that host.

```env
# Vercel Production Environment
NEXT_PUBLIC_SITE_URL=https://www.kalnehi.com
SITEMAP_BASE_URL=https://www.kalnehi.com
```

**Then in Google Search Console:**

- Add property as **URL-prefix**: `https://www.kalnehi.com/`
- Verify ownership
- Submit `https://www.kalnehi.com/sitemap.xml`

**Why:** Same host for redirects, env, sitemaps, and GSC avoids “alternate page with proper canonical” noise.

### If you need apex as the public brand URL

That requires **changing** [`next.config.ts`](next.config.ts) (remove or invert the apex→www redirect) so users are not 308’d to `www`. As shipped, **do not** set only apex in env while the redirect still sends traffic to `www` — metadata and reality would diverge.

### Avoid: split canonical vs sitemap host

Do **not** intentionally set `NEXT_PUBLIC_SITE_URL` and `SITEMAP_BASE_URL` to different hosts unless you have a documented exception. Google and GSC work best when canonical links and `/sitemap*.xml` `<loc>` values share one origin.

## How to Set Vercel Environment Variables

### Via Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select your **kalnehi-daily** project
3. **Settings** → **Environment Variables**
4. Add/edit:
   - **`NEXT_PUBLIC_SITE_URL`** (for all environments, or just Production)
   - **`SITEMAP_BASE_URL`** (optional; for all environments)
5. Click **Save**
6. Redeploy or wait for next deployment

### Via Vercel CLI (from your repo)

```bash
# Log in
vercel login

# Set production variable
vercel env add NEXT_PUBLIC_SITE_URL production
# Then enter the value when prompted

# Set staging (preview) if needed
vercel env add NEXT_PUBLIC_SITE_URL preview
```

Then commit/push to trigger a redeploy.

## Diagnosing the Issue in Google Search Console

### Step 1: Check Host Alignment

1. Visit your live site (e.g., `https://www.kalnehi.com/vs/notion`)
2. Inspect the HTML `<head>`:
   - What does `<link rel="canonical">` say?
   - With the recommended env, both should use **www**, e.g. `https://www.kalnehi.com/vs/notion`
3. Check `/sitemap-pages.xml`:
   - What host is in `<loc>` entries?
   - They should match the same origin as `NEXT_PUBLIC_SITE_URL` / `getSitemapBaseUrl()`

**If canonical ≠ sitemap host, Google will treat them as duplicates and pick one. GSC will show "Alternate page with proper canonical."**

### Step 2: Use URL Inspection in GSC

1. Go to Google Search Console
2. Select the property matching your preferred host
3. **URL Inspection** → paste a URL on your **live** canonical host (e.g. `https://www.kalnehi.com/vs/notion`)
4. Check the report:
   - **Coverage:** "Indexed", "Crawled but not indexed", or "Excluded"
   - **Canonical:** what does Google see?
   - **Robots.txt:** is the path allowed?
   - **Mobile usability:** any issues?

### Step 3: Check Sitemaps in GSC

1. **Sitemaps** section
2. Verify `sitemap.xml` is listed and shows count of submitted URLs
3. Check if specific URLs (like `/vs/*`) are listed with errors or warnings

## Robots.txt and sitemap alignment

Page sitemap entries are built from **`MARKETING_SITEMAP`** in [src/lib/sitemap-data.ts](src/lib/sitemap-data.ts): **marketing / public URLs only** (comment at lines 45–48). Exam landings use **`EXAM_SITEMAP_PATHS`** (separate `sitemap-exams.xml`). App-only routes blocked in [src/app/robots.ts](src/app/robots.ts) should **not** appear in these sitemaps.

If you add new marketing URLs, ensure they are **allowed** in `robots.ts` and included only in the marketing lists above—otherwise GSC may report “Submitted and blocked by robots.txt.”

## Marketing URLs Status

These **should** be in the sitemap (where applicable) and **should** be indexable (no noindex, allowed by robots.txt):

✅ `/vs` (hub)
✅ `/vs/*` (comparisons) — entries under `MARKETING_SITEMAP`
✅ `/jee`, `/neet`, `/upsc`, etc. — `EXAM_SITEMAP_PATHS` (`sitemap-exams.xml`)
✅ `/guides`, `/guides/*`
✅ `/blog`, `/blog/*`
✅ `/features`, `/features/*`
✅ `/tools`, `/tools/*`
✅ `/pricing`
✅ `/about`
✅ `/contact`

## Action Checklist

- [ ] **Set production canonical to www** — `NEXT_PUBLIC_SITE_URL=https://www.kalnehi.com` (and matching `SITEMAP_BASE_URL` unless you intentionally diverge)
- [ ] **Confirm apex → www** — handled in [`next.config.ts`](next.config.ts) (no proxy host redirect)
- [ ] **Add URL-prefix property in Google Search Console** for `https://www.kalnehi.com/` (or your chosen host if you changed redirects)
- [ ] **Verify ownership** in GSC
- [ ] **Submit sitemaps** in GSC: `https://www.kalnehi.com/sitemap.xml` (or your canonical host)
- [ ] **Use URL Inspection** on sample `/vs/*` and exam URLs to confirm canonical and robots status
- [ ] **Monitor Coverage** in GSC for 2–4 weeks; expect initial "Crawled but not indexed" as Google processes new content

## Search Console API (Optional Automation)

If you want to submit sitemaps or pull analytics programmatically:

1. Create a service account in Google Cloud Console
2. Grant it `webmasters` API scope
3. Use the `googleapis` npm package:

```bash
npm install googleapis
```

4. Write a script (e.g., `scripts/gsc-submit-sitemap.js`) to submit or fetch data
5. Store credentials in `.env.local` (never commit)

See "Optional: Search Console API Script" section below for example code.

---

## Optional: Search Console API Script

**File:** `scripts/gsc-submit-sitemap.js`

```javascript
// Requires service account JSON key stored as env var
// Usage: node scripts/gsc-submit-sitemap.js

const { google } = require('googleapis');
const fs = require('fs');

const serviceAccountJson = process.env.GOOGLE_SEARCH_CONSOLE_SA || '{}';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.kalnehi.com';

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(serviceAccountJson),
  scopes: ['https://www.googleapis.com/auth/webmasters'],
});

async function submitSitemap() {
  try {
    const searchconsole = google.webmasters({ version: 'v1', auth });

    const sitemapUrl = `${siteUrl}/sitemap.xml`;

    console.log(`Submitting sitemap: ${sitemapUrl}`);

    const result = await searchconsole.sitemaps.submit({
      siteUrl: `sc-domain:${new URL(siteUrl).hostname}`, // or use sc-domain: for domain property
      requestBody: {
        sitemapUrl,
      },
    });

    console.log('✓ Sitemap submitted successfully.');
    console.log(result.data);
  } catch (error) {
    console.error('✗ Error submitting sitemap:', error.message);
    process.exit(1);
  }
}

submitSitemap();
```

**Then run:**
```bash
GOOGLE_SEARCH_CONSOLE_SA='{"type":"service_account",...}' \
  NEXT_PUBLIC_SITE_URL=https://www.kalnehi.com \
  node scripts/gsc-submit-sitemap.js
```

---

## References

- [Google Search Console Help](https://support.google.com/webmasters/answer/183669)
- [Sitemap Protocol](https://www.sitemaps.org/)
- [Robots.txt Specification](https://www.robotstxt.org/)
- [Google APIs Node.js Client](https://github.com/googleapis/google-api-nodejs-client)
- Code: [src/lib/site.ts](../src/lib/site.ts) — URL helpers
- Code: [next.config.ts](../next.config.ts) — Apex → www redirect
- Code: [src/lib/sitemap-data.ts](../src/lib/sitemap-data.ts) — Sitemap generation
- Code: [src/app/robots.ts](../src/app/robots.ts) — Robots rules
