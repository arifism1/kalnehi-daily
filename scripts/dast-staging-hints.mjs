#!/usr/bin/env node
/**
 * OWASP ZAP (or similar) manual DAST — run against staging, not production.
 *
 * Prereq: install ZAP https://www.zaproxy.org/download/  (or use packaged docker owasp/zap2docker-stable)
 *
 * Focus areas for this app:
 * — POST /api/* without session → expect 401 where routes require auth.
 * — PATCH /api/user/custom-reminders/:id with another user's UUID → expect 404.
 * — POST /api/razorpay/webhook with invalid signature → expect 4xx.
 * — GET /api/cron/* without Authorization: Bearer CRON_SECRET → expect 401.
 *
 * Example (baseline spider + active scan; tune context/auth headers for authenticated flows):
 *   zap-baseline.py -t https://your-staging-host.example
 */

const base =
  process.env.DAST_STAGING_BASE?.trim() ||
  process.env.API_PII_CHECK_BASE?.trim() ||
  "";

console.log(`DAST staging hints
Set DAST_STAGING_BASE=https://your-staging.example for documented runs.

${base ? `Target hint: ${base}\n` : "(Set DAST_STAGING_BASE to print your staging URL here.)\n"}
See script comments for ZAP install and API-focused tests.
`);
