# SEO & GSC Implementation Summary

**Date:** April 24, 2026  
**Status:** ✅ Complete — All 4 todos finished

---

## What Was Done

All tasks from the plan have been completed:

### 1. ✅ Environment & Host Alignment Documentation

**File created:** `SEO_ENVIRONMENT_GUIDE.md`

**Covers:**
- Current environment state (local, production)
- Sitemaps vs. canonicals mismatch (www vs apex)
- Recommended production configurations (3 options)
- How to set Vercel environment variables
- Robots.txt sitemap conflicts
- Action checklist

**Key finding:** Your app lacks `NEXT_PUBLIC_SITE_URL` env var in production, which causes sitemap/canonical misalignment. The guide provides 3 concrete options to fix this.

### 2. ✅ GSC Diagnostics Guide & Script

**Files created:**
- `GSC_DIAGNOSTICS_GUIDE.md` — step-by-step manual diagnostics
- `scripts/gsc-diagnostics.js` — automated canonical consistency checker

**Features:**
- Manual checks: curl commands to verify canonical consistency
- GSC URL Inspection walkthrough for troubleshooting
- Automated script that checks both `kalnehi.com` and `www.kalnehi.com` for canonical mismatch
- Fetches and compares sitemap URLs across hosts
- Output shows exact canonical host and robots tags

**Run it:**
```bash
node scripts/gsc-diagnostics.js
```

### 3. ✅ Sitemap Cleanup: Removed robots.txt Conflicts

**File modified:** `src/lib/sitemap-data.ts`

**What changed:**
- Removed 35+ app-only URLs from `sitemap-pages.xml`
- These URLs were **in sitemap but disallowed by robots.txt**
- Examples: `/planner/*`, `/dashboard/*`, `/settings`, `/my-subscription`, etc.

**Impact:**
- Eliminates "Submitted but disallowed by robots.txt" noise in GSC
- Focuses crawl budget on indexable marketing URLs
- Clearer coverage reporting

**Documentation:** `SITEMAP_CLEANUP_NOTES.md`

**Remaining in sitemap (all searchable):**
- Marketing pages: `/vs/*`, `/features/*`, `/guides/*`, `/tools/*`
- Exam landings: `/jee`, `/neet`, `/upsc`, etc.
- Content: `/blog/*`, `/pricing`, `/about`, etc.

### 4. ✅ Google Search Console API Scripts

**Files created:**
- `scripts/gsc-api.js` — programmatic sitemap management
- `GSC_API_SETUP.md` — comprehensive setup guide

**Commands available:**
```bash
# Submit sitemap
node scripts/gsc-api.js submit https://kalnehi.com/sitemap.xml

# List existing sitemaps
node scripts/gsc-api.js list-sitemaps kalnehi.com

# Get site coverage info
node scripts/gsc-api.js coverage kalnehi.com
```

**Setup (one-time):**
1. Create Google Cloud service account
2. Enable Search Console API
3. Add service account to GSC property
4. Store credentials in env var or file
5. Run commands

**Includes:**
- Full error handling
- GitHub Actions CI/CD example
- Cron job example
- Extensibility for future analytics queries

---

## Files Modified

| File | Change | Impact |
|------|--------|--------|
| `src/lib/sitemap-data.ts` | Removed 35 app-only URLs from `PAGES_SITEMAP` | Cleaner sitemap; no robots conflicts |

---

## Files Created

| File | Purpose |
|------|---------|
| `SEO_ENVIRONMENT_GUIDE.md` | Production env setup & host alignment |
| `GSC_DIAGNOSTICS_GUIDE.md` | Manual & automated canonical checking |
| `scripts/gsc-diagnostics.js` | Auto-check script (executable) |
| `SITEMAP_CLEANUP_NOTES.md` | Documentation of what was removed |
| `GSC_API_SETUP.md` | Programmatic GSC API guide |
| `scripts/gsc-api.js` | GSC API client (executable) |

---

## Immediate Next Steps (For You)

### Step 1: Set Production Environment (Required)

In Vercel dashboard (or via CLI):

```bash
vercel env add NEXT_PUBLIC_SITE_URL production
# Enter: https://kalnehi.com (or https://www.kalnehi.com)

# Optional: if using different sitemap host
vercel env add SITEMAP_BASE_URL production
# Enter: https://www.kalnehi.com (if different from NEXT_PUBLIC_SITE_URL)
```

Then **redeploy** to apply changes.

### Step 2: Verify in GSC

1. Run diagnostics script:
   ```bash
   node scripts/gsc-diagnostics.js
   ```
   Check for canonical mismatches.

2. In Google Search Console:
   - URL Inspection on a sample URL (e.g., `/vs/notion`)
   - Verify canonical matches your env setting
   - Check robots.txt shows path as allowed

### Step 3: Submit Sitemap (Optional but Recommended)

If not already submitted in GSC:

```bash
# Manual: go to GSC → Sitemaps → add https://kalnehi.com/sitemap.xml

# Or automated (requires service account):
GOOGLE_SEARCH_CONSOLE_SA=$HOME/.gsc-sa.json \
  node scripts/gsc-api.js submit https://kalnehi.com/sitemap.xml
```

### Step 4: Monitor Coverage

Wait 2–4 weeks. In GSC Coverage section:
- You should NOT see "Submitted but disallowed by robots.txt"
- App-only URLs should stop appearing
- Marketing URLs should show as indexed (or crawled)

---

## Why Your Pages Aren't Showing in Google

This is typically caused by:

1. **Host mismatch** (www vs apex) — sitemap says one thing, canonical says another
   → **Fix:** Set `NEXT_PUBLIC_SITE_URL` env var

2. **Low authority/new content** — Google hasn't ranked them yet
   → **Wait:** 2–4 weeks; ensure unique, high-quality content

3. **Robots.txt blocking** — page disallowed
   → **Check:** Diagnostics script will show this; should be fixed now

4. **Noindex tag** — page explicitly excluded
   → **Fix:** Marketing pages should NOT have noindex (none do by default)

5. **Duplicate content** — too similar to other sites
   → **Content strategy:** Ensure unique angle on comparisons and guides

6. **Sitemap not submitted** — Google hasn't been notified
   → **Fix:** Submit in GSC Sitemaps section

---

## Testing the Scripts Locally

### Diagnostics Script (No Auth Required)

```bash
# Test canonical consistency
node scripts/gsc-diagnostics.js
```

Output example:
```
📊 Checking host: kalnehi.com

  /vs/notion                → canonical: https://kalnehi.com/vs/notion | robots: (not set)
  /neet                     → canonical: https://kalnehi.com/neet | robots: (not set)
  ...
```

### GSC API Script (Requires Service Account)

```bash
# First, set up service account (see GSC_API_SETUP.md)

# List sitemaps
GOOGLE_SEARCH_CONSOLE_SA=$HOME/.gsc-sa.json \
  node scripts/gsc-api.js list-sitemaps kalnehi.com

# Submit sitemap
GOOGLE_SEARCH_CONSOLE_SA=$HOME/.gsc-sa.json \
  node scripts/gsc-api.js submit https://kalnehi.com/sitemap.xml
```

---

## Code Changes Summary

### `src/lib/sitemap-data.ts`

**Before:**
```javascript
const PAGES_SITEMAP = [
  // ... marketing URLs ...
  { path: "/daily-plan", ... },
  { path: "/planner", ... },
  { path: "/my-subscription", ... },
  // ... 32 more app-only URLs conflicting with robots.txt ...
];
```

**After:**
```javascript
const MARKETING_SITEMAP = [
  // Only public marketing URLs (no app-only paths)
  { path: "/", ... },
  { path: "/blog", ... },
  { path: "/vs", ... },
  { path: "/features", ... },
  // etc.
];

const PAGES_SITEMAP = MARKETING_SITEMAP;
```

**Effect:**
- Sitemap now only contains searchable, public marketing URLs
- No more conflicts with robots.txt disallow rules
- Cleaner GSC coverage reports
- Better crawl budget allocation

---

## Long-Term Monitoring

After implementing:

1. **Weekly:** Check [GSC Coverage](https://search.google.com/search-console/coverage) for "Excluded" or "Error" trends
2. **Monthly:** Use [GSC Performance](https://search.google.com/search-console/performance) to see rankings for `/vs/*`, `/jee`, `/neet` etc.
3. **Quarterly:** Re-run `gsc-diagnostics.js` to ensure host alignment is maintained

---

## References

All files contain inline comments and links. Key documents:

- [`SEO_ENVIRONMENT_GUIDE.md`](SEO_ENVIRONMENT_GUIDE.md) — Start here for production setup
- [`GSC_DIAGNOSTICS_GUIDE.md`](GSC_DIAGNOSTICS_GUIDE.md) — For troubleshooting indexing
- [`GSC_API_SETUP.md`](GSC_API_SETUP.md) — For automation
- [`SITEMAP_CLEANUP_NOTES.md`](SITEMAP_CLEANUP_NOTES.md) — What was removed and why

---

## Questions?

Refer to the relevant guide:
- "Why aren't my pages indexed?" → See GSC_DIAGNOSTICS_GUIDE.md
- "How do I set production env vars?" → See SEO_ENVIRONMENT_GUIDE.md
- "Can I automate sitemap submission?" → See GSC_API_SETUP.md
- "What URLs were removed from sitemap?" → See SITEMAP_CLEANUP_NOTES.md

✅ **All work complete.** You now have:
- ✅ Production environment setup guide
- ✅ Diagnostic tools (manual + automated)
- ✅ Fixed sitemap (no more robots conflicts)
- ✅ Automation scripts for GSC (optional)
