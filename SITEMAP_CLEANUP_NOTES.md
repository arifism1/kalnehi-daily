# Sitemap Cleanup: Resolved robots.txt Conflicts

**Date:** April 24, 2026

## Summary

Removed ~35 app-only URLs from `sitemap-pages.xml` that were conflicting with `robots.txt` disallow rules. This eliminates wasted crawl budget and confusion in Google Search Console.

## What Changed

### File: `src/lib/sitemap-data.ts`

**Removed from sitemap (lines 106–143 in original):**

These URLs are disallowed by `src/app/robots.ts` and should NOT appear in any searchable sitemap:

```
/daily-plan
/planner
/planner/schedule
/planner/todos
/planner/weekly
/planner/routine
/planner/habits
/planner/productivity
/plan-my-day
/plan
/syllabus (the app page, not the content path)
/meditation
/meditation/consistency
/my-subscription
/settings
/target-score-blueprint
/my-target
/saved-plans
/study-sessions
/prepbrain
/marks-engine
/daily-engine
/revision-tracker
/progress
/heatmap
/calendar
/consistency-tracker
/habits
/timer
/motivation
/notifications
/feedback
/doubts
/profile
/onboarding
/dictate-day
/self-type
/self-type-day
```

**Why they were removed:**
- All are **app routes** (behind auth or paywall)
- All are **explicitly disallowed** in `src/app/robots.ts`
- Having them in the sitemap signals to Google that they should be indexed, but robots.txt blocks them
- This creates "Submitted but disallowed" errors in GSC Coverage reports
- Wastes crawl budget on URLs Googlebot cannot index

**Refactoring:**
- Renamed `PAGES_SITEMAP` constant to `MARKETING_SITEMAP` for clarity
- Removed 35+ app-only entries; kept only public marketing URLs
- Added comment documenting what was excluded (for future reference)

## Remaining Marketing URLs (Kept in Sitemap)

**Public, searchable URLs still included:**

- `/` (homepage)
- `/blog`, `/blog/*` (blog posts via separate sitemap)
- `/pricing`
- `/guides`, `/guides/*`
- `/features`, `/features/*`
- `/vs`, `/vs/*` (comparisons)
- `/for/*` (audience-specific landing pages)
- `/tools`, `/tools/*`
- `/search`
- `/about`, `/contact`
- `/changelog`
- Legal pages (`/privacy`, `/terms`, `/refund`, etc.)
- `/kalnehi-daily` (landing page)
- `/syllabus/*` (public syllabus content paths)
- Exam landing pages (`/jee`, `/neet`, etc.) — in `sitemap-exams.xml`

All these are:
1. **Allowed** by `robots.txt`
2. **Public** (no auth required)
3. **Searchable** (no noindex tag)

## Impact on Google Search Console

### Before Cleanup
- GSC Coverage reports showed "Submitted but disallowed by robots.txt" for 35+ URLs
- Confusing signal: URLs in sitemap that cannot be indexed
- Reduced clarity on actual coverage issues

### After Cleanup
- Only URLs that *can* and *should* be indexed appear in sitemap
- GSC Coverage becomes clearer and less noisy
- Crawl budget focused on indexable content

### What to Expect
- Next crawl cycle: GSC will stop attempting to crawl disallowed URLs from sitemap
- Coverage section may show fewer total URLs (that's expected and good)
- "Discovered" count may decrease as duplicates/conflicts are resolved
- Indexed count should remain stable (no marketing URLs were removed; only app-only URLs)

## How to Monitor

1. **Google Search Console** → **Coverage** section
2. Look for "Submitted and disallowed by robots.txt" — should be near zero
3. Check "Excluded" reasons — should not list your marketing pages
4. **URL Inspection** sample URLs from each category:
   - `/vs/notion` (comparison)
   - `/neet` (exam)
   - `/guides/...` (guide)
   - `/features/...` (feature)

## Future: Optional Internal Sitemap

If in the future you want to expose app routes (e.g., after auth changes or when some become public), you can:

1. **Create a separate `sitemap-app.xml` route** (internal/private only)
2. **Do NOT list it in the sitemap index** (so Googlebot never sees it)
3. **Use it only for internal logging or analytics**

The excluded URLs are documented in the code for easy re-addition if needed.

---

## References

- File changed: [src/lib/sitemap-data.ts](../src/lib/sitemap-data.ts)
- Robots rules: [src/app/robots.ts](../src/app/robots.ts)
- Marketing paths: [src/lib/public-paths.ts](../src/lib/public-paths.ts)
