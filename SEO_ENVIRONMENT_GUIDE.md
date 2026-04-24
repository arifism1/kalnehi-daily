# SEO & Google Search Console Environment Guide

**Last Updated:** April 24, 2026

## Current Environment State

### Local Development (`.env` / `.env.local`)

Neither `.env` nor `.env.local` currently define:
- `NEXT_PUBLIC_SITE_URL`
- `SITEMAP_BASE_URL`
- `NEXT_PUBLIC_SITEMAP_BASE_URL`

This means **localhost is used by default** (see `src/lib/site.ts:50`).

### Sitemaps & Canonicals — Default Behavior

| Component | Current Behavior | Code Reference |
|-----------|-----------------|-----------------|
| **Sitemap `<loc>` URLs** | Default to `https://www.kalnehi.com` (hardcoded in code) | `src/lib/site.ts:9` `DEFAULT_SITEMAP_BASE_URL` |
| **Canonical `<link>` & `og:url`** | Use `NEXT_PUBLIC_SITE_URL` if set; else Vercel URL; else localhost | `src/lib/site.ts:50` `getSiteUrl()` |
| **Live www → apex redirect** | If `NEXT_PUBLIC_SITE_URL` is set, sends www → apex (308) except for sitemaps/robots | `src/proxy.ts:243` `tryWwwToApexRedirect()` |

### In Production (Vercel)

**You must explicitly set environment variables** in the Vercel dashboard or via `vercel env` CLI:

1. **`NEXT_PUBLIC_SITE_URL`** — The canonical domain your app prefers (e.g. `https://kalnehi.com` for apex or `https://www.kalnehi.com` for www)
   - Used for page `<link rel="canonical">` and redirects
   - Visible to the browser/Googlebot

2. **`SITEMAP_BASE_URL`** (optional) — If different from `NEXT_PUBLIC_SITE_URL`, use this for sitemap `<loc>` entries
   - Must match your GSC property host
   - If not set, falls back to `NEXT_PUBLIC_SITEMAP_BASE_URL` or the hardcoded `DEFAULT_SITEMAP_BASE_URL` (`https://www.kalnehi.com`)

## Recommended Production Configuration

### Option A: Apex Host (Simple & Modern)

```env
# Vercel Production Environment
NEXT_PUBLIC_SITE_URL=https://kalnehi.com
SITEMAP_BASE_URL=https://kalnehi.com
```

**Then in Google Search Console:**
- Add property as **Domain** (not URL-prefix): `kalnehi.com`
- Verify ownership
- Submit `https://kalnehi.com/sitemap.xml`

**Advantages:**
- One canonical host; no www confusion
- Simpler redirect logic

### Option B: www Host (Traditional)

```env
# Vercel Production Environment
NEXT_PUBLIC_SITE_URL=https://www.kalnehi.com
SITEMAP_BASE_URL=https://www.kalnehi.com
```

**Then in Google Search Console:**
- Add property as **URL-prefix**: `https://www.kalnehi.com/`
- Verify ownership
- Submit `https://www.kalnehi.com/sitemap.xml`

**Advantages:**
- Cleaner URL for static marketing pages
- Matches current sitemap default

### Option C: Multi-host with Redirect

```env
# Vercel Production Environment
NEXT_PUBLIC_SITE_URL=https://kalnehi.com
SITEMAP_BASE_URL=https://www.kalnehi.com
```

Then redirect www → apex in `proxy.ts` (already implemented) and set GSC to track apex.

**Why this might happen:**
- You want the canonical to be apex but still use www in sitemaps temporarily
- Not recommended long-term; can confuse Google

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
   - Example: `<link rel="canonical" href="https://kalnehi.com/vs/notion">`
3. Check `/sitemap-pages.xml`:
   - What host is in `<loc>` entries?
   - Example: `<loc>https://www.kalnehi.com/vs/notion</loc>`

**If canonical ≠ sitemap host, Google will treat them as duplicates and pick one. GSC will show "Alternate page with proper canonical."**

### Step 2: Use URL Inspection in GSC

1. Go to Google Search Console
2. Select the property matching your preferred host
3. **URL Inspection** → paste a URL (e.g., `https://kalnehi.com/vs/notion` or `https://www.kalnehi.com/neet`)
4. Check the report:
   - **Coverage:** "Indexed", "Crawled but not indexed", or "Excluded"
   - **Canonical:** what does Google see?
   - **Robots.txt:** is the path allowed?
   - **Mobile usability:** any issues?

### Step 3: Check Sitemaps in GSC

1. **Sitemaps** section
2. Verify `sitemap.xml` is listed and shows count of submitted URLs
3. Check if specific URLs (like `/vs/*`) are listed with errors or warnings

## Robots.txt Issue: Sitemap vs. Disallow Conflict

**Critical finding:** [src/lib/sitemap-data.ts](src/lib/sitemap-data.ts) includes many URLs in `PAGES_SITEMAP` that are **explicitly disallowed** in [src/app/robots.ts](src/app/robots.ts):

**URLs in sitemap but disallowed by robots.txt:**
- `/planner/*`
- `/daily-plan`
- `/my-subscription`
- `/settings`
- `/dashboard/*`
- And many others (app routes, not marketing routes)

**Why this is a problem:**
- GSC reports "Submitted and crawlable but blocked by robots.txt"
- Wastes crawl budget on URLs Googlebot cannot index
- Creates noise in GSC coverage reports
- Signals confusion to Google

**Fix:** Remove app-only URLs from sitemap (see "Sitemap Cleanup" section below).

## Marketing URLs Status

These **should** be in the sitemap and **should** be indexable (no noindex, allowed by robots.txt):

✅ `/vs` (hub)
✅ `/vs/*` (comparisons) — listed in `PAGES_SITEMAP` line 73–78
✅ `/jee`, `/neet`, `/upsc`, etc. — in `EXAM_SITEMAP_PATHS` (separate `sitemap-exams.xml`)
✅ `/guides`, `/guides/*`
✅ `/blog`, `/blog/*`
✅ `/features`, `/features/*`
✅ `/tools`, `/tools/*`
✅ `/pricing`
✅ `/about`
✅ `/contact`

## Sitemap Cleanup (Optional but Recommended)

Split `PAGES_SITEMAP` in [src/lib/sitemap-data.ts](src/lib/sitemap-data.ts) into two groups:

1. **Marketing URLs** (public, searchable):
   - Keep these in the sitemap
   - Examples: `/`, `/pricing`, `/guides/*`, `/vs/*`, exam pages, features, blog

2. **App-only URLs** (require auth or are behind paywall):
   - Remove from sitemap
   - Examples: `/planner/*`, `/dashboard/*`, `/settings`, `/my-subscription`, `/habits`, `/daily-plan`, `/prepbrain`, etc.

**Current line causing the mess:** `PAGES_SITEMAP` includes both types mixed together.

**Action:** Create a separate `MARKETING_SITEMAP_PATHS` array with only public marketing URLs and update the route to use it.

## Action Checklist

- [ ] **Decide your canonical host** (apex `kalnehi.com` OR www `www.kalnehi.com`)
- [ ] **Set Vercel env vars** (`NEXT_PUBLIC_SITE_URL` + optionally `SITEMAP_BASE_URL`)
- [ ] **Add property to Google Search Console** (Domain or URL-prefix, matching your choice)
- [ ] **Verify ownership** in GSC (TXT record, HTML file, or other method)
- [ ] **Submit sitemaps** in GSC: `https://<your-host>/sitemap.xml`
- [ ] **Use URL Inspection** on sample `/vs/*` and exam URLs to confirm canonical and robots status
- [ ] **(Optional) Clean up sitemap** to remove app-only URLs conflicting with robots.txt
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
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kalnehi.com';

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
  NEXT_PUBLIC_SITE_URL=https://kalnehi.com \
  node scripts/gsc-submit-sitemap.js
```

---

## References

- [Google Search Console Help](https://support.google.com/webmasters/answer/183669)
- [Sitemap Protocol](https://www.sitemaps.org/)
- [Robots.txt Specification](https://www.robotstxt.org/)
- [Google APIs Node.js Client](https://github.com/googleapis/google-api-nodejs-client)
- Code: [src/lib/site.ts](../src/lib/site.ts) — URL helpers
- Code: [src/lib/sitemap-data.ts](../src/lib/sitemap-data.ts) — Sitemap generation
- Code: [src/app/robots.ts](../src/app/robots.ts) — Robots rules
