# Google Search Console Diagnostics Guide

**Purpose:** Verify that your marketing pages (comparisons, exams) are being indexed correctly and have consistent canonical tags.

## Quick Manual Steps (No Code)

### 1. Check Current URL Signals

**Visit your live site and inspect source:**

```bash
# Example: check www vs apex, and inspect canonical
curl -s https://www.kalnehi.com/vs/notion | grep -i canonical
curl -s https://kalnehi.com/vs/notion | grep -i canonical

# Same for exam page
curl -s https://www.kalnehi.com/neet | grep -i canonical
curl -s https://kalnehi.com/neet | grep -i canonical
```

**Expected output:** Both should show the same canonical host (either both `kalnehi.com` or both `www.kalnehi.com`).

**If different:** You have a host mismatch. Google will treat them as duplicates.

### 2. Check Sitemap Contents

```bash
# Fetch the sitemap index
curl -s https://www.kalnehi.com/sitemap.xml

# Fetch individual sitemaps
curl -s https://www.kalnehi.com/sitemap-pages.xml | head -100
curl -s https://www.kalnehi.com/sitemap-exams.xml | head -50
curl -s https://www.kalnehi.com/sitemap-blog.xml | head -50
```

**Look for:**
- Host consistency (all `www.kalnehi.com` or all `kalnehi.com`?)
- Presence of `/vs/*` URLs in `sitemap-pages.xml`
- Presence of `/neet`, `/jee`, etc., in `sitemap-exams.xml`

### 3. Verify Robots.txt Allows Marketing URLs

```bash
curl -s https://www.kalnehi.com/robots.txt | grep -A 5 "Allow:"
```

**Check:** Does `/vs/`, `/blog/`, `/guides/`, `/features/`, and exam paths appear in `Allow:` list?

**Do NOT appear in `Disallow:`** section.

---

## Google Search Console URL Inspection (Manual Process)

### Step-by-Step

1. **Go to Google Search Console** → https://search.google.com/search-console/
2. **Select your property** (must match your canonical host: either `kalnehi.com` Domain or `https://www.kalnehi.com/` URL-prefix)
3. **Top search bar** → "URL Inspection"
4. **Paste test URLs one by one:**
   - `https://www.kalnehi.com/vs/notion`
   - `https://www.kalnehi.com/neet`
   - `https://www.kalnehi.com/jee`
   - `https://www.kalnehi.com/pricing`

### What to Check in Each Inspection Report

| Field | What to Look For | ✅ OK | ❌ Problem |
|-------|------------------|-------|----------|
| **URL is on the web** | Googlebot can reach it | "True" | "False" = not publicly accessible |
| **Coverage** | Index status | "Indexed" | "Crawled – not indexed" = something is wrong |
| **Canonical** | What Google thinks is canonical | Matches your env | Different host = mismatch |
| **Robots.txt** | Is path blocked? | "Allowed" or not listed | "Disallowed" = problem |
| **Noindex** | Meta robots rule | "Not set" (or not noindex) | "Noindex" = excluded from index |
| **Mobile usability** | Mobile issues | None | Core Web Vitals issues |

### Example Issue: Host Mismatch

```
URL inspected: https://www.kalnehi.com/vs/notion
Coverage: "Crawled but not indexed"
Canonical: "https://kalnehi.com/vs/notion" ← Different host!
```

**Action:** Set `NEXT_PUBLIC_SITE_URL` so both sitemap and canonical match the same host.

---

## Automated Diagnostics Script

**File:** `scripts/gsc-diagnostics.js`

This script checks canonical consistency locally without needing GSC API credentials.

```javascript
#!/usr/bin/env node
/**
 * GSC Diagnostics: Check canonical consistency across hosts and sitemaps
 * Usage: node scripts/gsc-diagnostics.js [host]
 *
 * Examples:
 *   node scripts/gsc-diagnostics.js kalnehi.com
 *   node scripts/gsc-diagnostics.js www.kalnehi.com
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

const TEST_URLS = [
  '/vs/notion',
  '/vs/google-calendar',
  '/neet',
  '/jee',
  '/upsc',
  '/pricing',
  '/about',
  '/features',
  '/guides',
];

async function fetchUrl(urlString) {
  return new Promise((resolve, reject) => {
    const client = urlString.startsWith('https') ? https : http;
    client
      .get(urlString, { timeout: 5000 }, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

function extractCanonical(html) {
  const match = html.match(/<link[^>]*rel="?canonical"?[^>]*href="([^"]+)"/i);
  return match ? match[1] : null;
}

function extractMetaRobots(html) {
  const match = html.match(/<meta[^>]*name="robots"[^>]*content="([^"]+)"/i);
  return match ? match[1] : null;
}

async function checkHost(host) {
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const results = [];

  console.log(`\n📊 Checking host: ${host}\n`);

  for (const path of TEST_URLS) {
    const fullUrl = `${protocol}://${host}${path}`;
    try {
      const html = await fetchUrl(fullUrl);
      const canonical = extractCanonical(html);
      const robots = extractMetaRobots(html);

      results.push({
        path,
        url: fullUrl,
        canonical,
        robots: robots || '(none)',
        status: '✓',
      });

      console.log(
        `  ${path.padEnd(25)} → canonical: ${
          canonical || '(not found)'.padEnd(40)
        } | robots: ${robots || '(not set)'}`,
      );
    } catch (error) {
      results.push({
        path,
        url: fullUrl,
        error: error.message,
        status: '✗',
      });
      console.log(`  ${path.padEnd(25)} → ✗ ERROR: ${error.message}`);
    }
  }

  return results;
}

async function checkSitemapHosts() {
  console.log('\n🗺️  Sitemap Host Check\n');

  const hosts = ['kalnehi.com', 'www.kalnehi.com'];

  for (const host of hosts) {
    try {
      const protocol = 'https';
      const sitemapUrl = `${protocol}://${host}/sitemap-pages.xml`;
      const xml = await fetchUrl(sitemapUrl);

      // Extract first 5 <loc> entries
      const locRegex = /<loc>([^<]+)<\/loc>/g;
      const matches = xml.match(locRegex) || [];
      const locs = matches.slice(0, 5).map((m) => m.replace(/<\/?loc>/g, ''));

      console.log(`  Sitemap host: ${host}`);
      console.log(`  Sample URLs:`);
      locs.forEach((loc) => {
        const u = new URL(loc);
        console.log(`    - ${u.hostname}${u.pathname}`);
      });
      console.log('');
    } catch (error) {
      console.log(`  ✗ Could not fetch from ${host}: ${error.message}\n`);
    }
  }
}

async function main() {
  const hostArg = process.argv[2] || 'kalnehi.com';
  const alsoCheck = hostArg === 'kalnehi.com' ? 'www.kalnehi.com' : 'kalnehi.com';

  console.log(
    '\n═══════════════════════════════════════════════════════════════',
  );
  console.log('   GSC Diagnostics: Canonical & Robots Consistency Check   ');
  console.log(
    '═══════════════════════════════════════════════════════════════',
  );

  await checkHost(hostArg);
  await checkHost(alsoCheck);
  await checkSitemapHosts();

  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('✅ Diagnostics complete. Check for:');
  console.log('   1. Canonical mismatch between hosts');
  console.log('   2. noindex or robots=nofollow tags');
  console.log('   3. Sitemap host consistency\n');
}

main().catch((e) => {
  console.error('❌ Script error:', e.message);
  process.exit(1);
});
```

### Run the Script

```bash
# Check both kalnehi.com and www.kalnehi.com
node scripts/gsc-diagnostics.js

# Or check only one
node scripts/gsc-diagnostics.js www.kalnehi.com
```

### Example Output

```
═══════════════════════════════════════════════════════════════
   GSC Diagnostics: Canonical & Robots Consistency Check   
═══════════════════════════════════════════════════════════════

📊 Checking host: kalnehi.com

  /vs/notion                → canonical: https://kalnehi.com/vs/notion | robots: (not set)
  /vs/google-calendar       → canonical: https://kalnehi.com/vs/google-calendar | robots: (not set)
  /neet                     → canonical: https://kalnehi.com/neet | robots: (not set)
  /jee                      → canonical: https://kalnehi.com/jee | robots: (not set)
  ...

📊 Checking host: www.kalnehi.com

  /vs/notion                → canonical: https://kalnehi.com/vs/notion | robots: (not set)
  ✗ Connection refused
```

**Good:** Both hosts declare the same canonical (`kalnehi.com`).  
**Bad:** Different canonicals or host mismatch.

---

## What Each Issue Means

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| "Crawled but not indexed" in GSC | Content quality, duplicate, or low authority | Wait; ensure unique, high-quality content |
| Canonical mismatch (www vs apex) | Different `NEXT_PUBLIC_SITE_URL` or env not deployed | Set and deploy `NEXT_PUBLIC_SITE_URL` consistently |
| "Disallowed by robots.txt" | URL in Disallow; or in Sitemap but disallowed | Check [src/app/robots.ts](../src/app/robots.ts); remove conflicting URLs from sitemap |
| "Noindex" | Page sets `noindex: true` in metadata | Check [src/lib/marketing-seo.ts](../src/lib/marketing-seo.ts); remove noindex from marketing pages |
| Sitemap not submitted | Forgot to add in GSC | Go to GSC Sitemaps section; add `https://<host>/sitemap.xml` |

---

## Next Steps After Diagnostics

1. **If canonical mismatch found:**
   - Set `NEXT_PUBLIC_SITE_URL` in Vercel env
   - Deploy
   - Re-run this script to confirm

2. **If "disallowed by robots.txt":**
   - Run the sitemap cleanup (next todo)
   - Or update [src/app/robots.ts](../src/app/robots.ts) to allow paths

3. **If "crawled but not indexed":**
   - Check GSC Coverage section for details
   - Ensure page is not too similar to others
   - Consider adding more unique, high-quality content

4. **If looks good:**
   - Submit sitemap in GSC if not already done
   - Wait 2–4 weeks for Google to crawl and index new content
   - Monitor Coverage section for changes

---

## References

- [Google URL Inspection Tool](https://support.google.com/webmasters/answer/9012289)
- [Canonical URLs](https://developers.google.com/search/docs/beginner/seo-starter-guide#use-the-robots-meta-tag)
- [Sitemap Guidelines](https://support.google.com/webmasters/answer/183669)
