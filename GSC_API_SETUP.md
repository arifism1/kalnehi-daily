# Google Search Console API — Setup & Usage

**Purpose:** Programmatically submit sitemaps, list sitemaps, and fetch site coverage data from Google Search Console without logging into the UI.

---

## Quick Start (5 minutes)

### 1. Set Up Service Account (One-time)

1. Go to **Google Cloud Console** → https://console.cloud.google.com/
2. **Create Project** (if needed) or select your existing project
3. **APIs & Services** → **Library**
4. Search for **"Search Console API"**
5. Click **Enable**
6. **Credentials** → **Create Credentials** → **Service Account**
7. Enter name (e.g., `kalnehi-gsc`)
8. **Create and Continue** (skip optional steps)
9. **Keys** tab → **Add Key** → **Create new key** → **JSON**
10. Save the downloaded JSON file securely (e.g., `~/.gsc-sa.json`)

### 2. Grant GSC Permissions (One-time)

The service account needs access to your GSC property:

1. Go to **Google Search Console** → https://search.google.com/search-console/
2. Select your property (e.g., `sc-domain:kalnehi.com`)
3. **Settings** → **Users & permissions**
4. **Add user**
5. Paste the **client_email** from the JSON file (looks like `kalnehi-gsc@project-id.iam.gserviceaccount.com`)
6. Select role: **Owner** or **Full**
7. **Send invitation**

### 3. Store Credentials

```bash
# Option A: Store in .env.local (never commit)
echo "GOOGLE_SEARCH_CONSOLE_SA=/path/to/gsc-sa.json" >> .env.local

# Option B: Set in shell
export GOOGLE_SEARCH_CONSOLE_SA=/path/to/gsc-sa.json

# Option C: Pass via environment variable (inline)
GOOGLE_SEARCH_CONSOLE_SA=/path/to/gsc-sa.json node scripts/gsc-api.js submit ...
```

### 4. Install Dependencies

```bash
npm install googleapis
```

### 5. Run Commands

```bash
# Submit sitemap
node scripts/gsc-api.js submit https://kalnehi.com/sitemap.xml

# List existing sitemaps
node scripts/gsc-api.js list-sitemaps kalnehi.com

# Get site info
node scripts/gsc-api.js coverage kalnehi.com
```

---

## Available Commands

### Submit Sitemap

```bash
node scripts/gsc-api.js submit <sitemap-url>
```

**Example:**
```bash
node scripts/gsc-api.js submit https://kalnehi.com/sitemap.xml
```

**What it does:**
- Submits (or resubmits) a sitemap to GSC
- Returns 200 on success
- Returns 409 if already submitted (that's OK)

**Output:**
```
📤 Submitting sitemap to Google Search Console
   Property: sc-domain:kalnehi.com
   Sitemap:  https://kalnehi.com/sitemap.xml

✅ Sitemap submitted successfully!
```

### List Sitemaps

```bash
node scripts/gsc-api.js list-sitemaps <hostname>
```

**Example:**
```bash
node scripts/gsc-api.js list-sitemaps kalnehi.com
```

**What it does:**
- Lists all sitemaps submitted for a property
- Shows last submission and download times

**Output:**
```
📋 Listing sitemaps for sc-domain:kalnehi.com

✅ Sitemaps found:
   1. https://kalnehi.com/sitemap.xml
      Last submitted: 2026-04-24T10:30:00Z
      Last downloaded: 2026-04-24T11:00:00Z
      Type: Sitemap Index
   2. https://kalnehi.com/sitemap-pages.xml
      Last submitted: 2026-04-24T10:30:00Z
      Last downloaded: 2026-04-24T11:02:00Z
```

### Get Coverage Data

```bash
node scripts/gsc-api.js coverage <hostname>
```

**Example:**
```bash
node scripts/gsc-api.js coverage kalnehi.com
```

**What it does:**
- Fetches general site information from GSC
- Shows property type and verification status

**Output:**
```
📊 Fetching coverage data from Google Search Console
   Property: sc-domain:kalnehi.com

✅ Site info retrieved:
{
  "siteUrl": "sc-domain:kalnehi.com",
  "permissionLevel": "siteOwner"
}
```

---

## Automated Workflows

### GitHub Actions: Auto-submit Sitemap on Deployment

**File:** `.github/workflows/gsc-submit.yml`

```yaml
name: Submit Sitemap to GSC

on:
  push:
    branches:
      - main

jobs:
  submit-sitemap:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm install googleapis

      - run: |
          GOOGLE_SEARCH_CONSOLE_SA='${{ secrets.GSC_SERVICE_ACCOUNT }}' \
          node scripts/gsc-api.js submit https://kalnehi.com/sitemap.xml

      - run: |
          GOOGLE_SEARCH_CONSOLE_SA='${{ secrets.GSC_SERVICE_ACCOUNT }}' \
          node scripts/gsc-api.js list-sitemaps kalnehi.com
```

**Setup:**
1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `GSC_SERVICE_ACCOUNT`
4. Paste the entire service account JSON

### Scheduled Cron: Check Sitemaps Daily

**File:** `scripts/gsc-monitor.sh`

```bash
#!/bin/bash
# Run daily to verify sitemaps are healthy

GOOGLE_SEARCH_CONSOLE_SA=$HOME/.gsc-sa.json

echo "=== GSC Sitemap Health Check ===" > /tmp/gsc-report.txt
date >> /tmp/gsc-report.txt

node scripts/gsc-api.js list-sitemaps kalnehi.com >> /tmp/gsc-report.txt 2>&1

# Optional: send email with results
# cat /tmp/gsc-report.txt | mail -s "GSC Sitemap Report" your@email.com
```

**Add to crontab:**
```bash
# Check sitemaps every day at 9 AM
0 9 * * * /path/to/scripts/gsc-monitor.sh
```

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `GOOGLE_SEARCH_CONSOLE_SA env var not set` | Missing credentials | Set `GOOGLE_SEARCH_CONSOLE_SA` env var |
| `Service account file not found: /path` | Wrong file path | Check file exists; use absolute path |
| `Failed to parse GOOGLE_SEARCH_CONSOLE_SA` | Invalid JSON | Verify JSON is valid (copy from GCP exactly) |
| `401 Unauthorized` | Service account not added to GSC property | Add service account email in GSC Settings → Users |
| `403 Forbidden` | Service account has wrong role | Must be Owner or Full in GSC property |
| `404 Not Found: Site not found` | Wrong property format | Use `sc-domain:kalnehi.com` or `https://kalnehi.com/` |
| `409 Conflict` | Sitemap already submitted | This is normal; script handles it |

### Debug Mode

To see detailed error messages:

```bash
# Verbose logging
DEBUG=googleapis:* node scripts/gsc-api.js submit https://kalnehi.com/sitemap.xml
```

---

## Storing Credentials Securely

### Option 1: File on Disk (Local Development)

```bash
# Save service account JSON to a file
# ~/.gsc-sa.json (never commit, add to .gitignore)

export GOOGLE_SEARCH_CONSOLE_SA=$HOME/.gsc-sa.json
node scripts/gsc-api.js list-sitemaps kalnehi.com
```

### Option 2: Environment Variable (CI/CD)

```bash
# GitHub Actions, Vercel, etc.
export GOOGLE_SEARCH_CONSOLE_SA='{"type":"service_account",...}'
node scripts/gsc-api.js submit https://kalnehi.com/sitemap.xml
```

### Option 3: .env.local (Development Only)

```bash
# .env.local (add to .gitignore)
GOOGLE_SEARCH_CONSOLE_SA=/path/to/gsc-sa.json
```

**Important:** Never commit service account keys to git. Add `.env.local` and `gsc-sa.json` to `.gitignore`.

---

## Limitations & Notes

1. **Search Analytics API not included:** The current script does NOT pull query data, impressions, clicks, or CTR. For that, you need the `searchanalytics.query()` API. Feel free to extend the script.

2. **URL Inspection not included:** Google's URL Inspection API is in preview and has limited availability. The script focuses on sitemap management instead.

3. **Rate limits:** Google applies rate limits (~1 request per second). The script respects these automatically.

4. **Property format:** Use `sc-domain:hostname` for simpler matching. Alternatively, use `https://hostname/` for URL-prefix properties (less common).

---

## Extending the Script

### Add Query Analytics

```javascript
async function getSearchAnalytics(hostname) {
  const auth = await createAuthClient();
  const webmasters = google.webmasters({ version: 'v1', auth });

  const property = `sc-domain:${hostname}`;
  const result = await webmasters.searchanalytics.query({
    siteUrl: property,
    requestBody: {
      startDate: '2026-04-17',
      endDate: '2026-04-24',
      dimensions: ['query', 'page'],
      rowLimit: 10,
    },
  });

  console.log(JSON.stringify(result.data.rows, null, 2));
}
```

Then call:
```bash
node scripts/gsc-api.js analytics kalnehi.com
```

---

## References

- [Google Search Console API](https://developers.google.com/webmaster-tools/v1)
- [googleapis NPM package](https://www.npmjs.com/package/googleapis)
- [Google Cloud Service Accounts](https://cloud.google.com/iam/docs/service-accounts)
- [Search Console Help](https://support.google.com/webmasters)
