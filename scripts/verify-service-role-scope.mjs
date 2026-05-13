#!/usr/bin/env node
/**
 * Service-role scope enforcement script.
 *
 * Scans the src/ tree for all files that import getSupabaseServiceRoleClient
 * or reference SUPABASE_SERVICE_ROLE_KEY, then diffs against the ALLOWLIST
 * below. Exits with code 1 if any file is found that is not in the allowlist.
 *
 * This catches newly added service-role usages that have not been reviewed.
 * Update the ALLOWLIST (with a scope comment) when adding a legitimately
 * new use of the service-role client.
 *
 * Run: npm run verify:service-role
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

// ── Allowlist ────────────────────────────────────────────────────────────────
// Every file that legitimately uses the service-role client. Add an entry
// with a scope note when introducing a new use — that forces a conscious review.
// Format: "src/relative/path": "scope description"
const ALLOWLIST = {
  // ── Core client definition ────────────────────────────────────────────────
  "src/lib/supabase/serviceRoleClient.ts":
    "Defines the client itself; no DB queries here.",

  // ── Auth routes (rate-limit RPCs run as service role before user session exists) ──
  "src/app/api/auth/login/route.ts":
    "After IP rate-limit RPC (pre-session); session created via route-handler client.",
  "src/app/api/auth/signup/route.ts":
    "After IP rate-limit RPC (pre-session); session created via route-handler client.",
  "src/app/api/auth/forgot-password/route.ts":
    "Rate-limit RPC for password reset emails (pre-session).",
  "src/app/api/auth/otp-verify/route.ts":
    "Rate-limit RPC for OTP verification (pre-session).",

  // ── Payment / subscription routes ────────────────────────────────────────
  "src/app/api/annual-plan/route.ts":
    "After getUser(); profile read scoped to user.id.",
  "src/app/api/annual-plan/verify/route.ts":
    "After getUser() + HMAC verify; subscription write scoped to user.id.",
  "src/app/api/six-month-plan/route.ts":
    "After getUser(); profile read scoped to user.id.",
  "src/app/api/six-month-plan/verify/route.ts":
    "After getUser() + HMAC verify; subscription write scoped to user.id.",
  "src/app/api/razorpay/webhook/route.ts":
    "After Razorpay HMAC verify (no user session); updates by subscription_id from trusted payload.",
  "src/actions/subscription.ts":
    "getAdminClient() only after server-action auth; all writes scoped to user.id from session.",
  "src/actions/referral.ts":
    "'use server'; getAdminClient() in admin-only helpers; user-facing calls scoped to authed user.",

  // ── Waitlist routes ───────────────────────────────────────────────────────
  "src/app/api/waitlist/join/route.ts":
    "IP rate-limit RPC then optional user session; waitlist row keyed to email/userId.",
  "src/app/api/waitlist/skip/route.ts":
    "After getUser(); profile read scoped to user.id.",
  "src/app/api/waitlist/skip/verify/route.ts":
    "After getUser() + HMAC; subscription/waitlist write scoped to user.id.",

  // ── PrepBrain / AI ────────────────────────────────────────────────────────
  "src/app/api/prepbrain/chat/route.ts":
    "After getUser(); all DB writes scoped to user.id + token accounting RPCs.",
  "src/app/api/prepbrain/usage/route.ts":
    "After getUser(); usage rows scoped to user.id.",
  "src/app/api/prepbrain/conversations/[id]/route.ts":
    "After getUser(); DELETE scoped to .eq(user_id, user.id).",

  // ── Voice routes ──────────────────────────────────────────────────────────
  "src/app/api/voice-parse-draft/route.ts":
    "After getUser(); usage log insert scoped to user.id.",
  "src/app/api/voice-command/route.ts":
    "After getUser(); usage log insert scoped to user.id.",

  // ── AI Study Partner ──────────────────────────────────────────────────────
  "src/app/api/study-partner/feedback/route.ts":
    "After getUser(); cooldown upsert scoped to user.id; fails hard if client unavailable.",
  "src/app/api/study-camera/verify/route.ts":
    "After getUser(); cooldown table scoped to user.id.",

  // ── FCM / push ────────────────────────────────────────────────────────────
  "src/app/api/fcm/register/route.ts":
    "After getUser(); push token upsert scoped to user.id.",
  "src/app/api/fcm/send/route.ts":
    "After getUser() + canAccessFcmBroadcastTools; broadcast uses admin gate.",
  "src/app/api/user/system-push/route.ts":
    "After getUser(); push ops scoped to user.id.",
  "src/app/api/push/danger-zone/route.ts":
    "After getUser(); dedupe + metrics scoped to user.id.",
  "src/lib/fcm/sendNotifications.ts":
    "sendFcmToUserTokens: scoped to userId arg. getDistinctUserIdsWithPushTokens: admin broadcast only (caller must gate).",

  // ── User resource routes ──────────────────────────────────────────────────
  // ── Analytics / referral (anonymous, no user session) ───────────────────
  "src/app/api/referral/event/route.ts":
    "Anonymous analytics endpoint; no user session. Per-IP rate limited. Inserts referral events with null user_id.",
  "src/app/api/public/landing-visit/route.ts":
    "Anonymous landing beacon; same-origin + IP rate limit; inserts allowlisted landing_page_visits rows.",
  "src/app/api/activity/active-time/route.ts":
    "After getUser(); RPC increments user_app_active_time_daily scoped to session user.id.",

  // ── Admin API routes (admin gate checked before service-role access) ──────
  "src/app/api/admin/app-config/route.ts":
    "After getUser() + isAdminUser(); app_config writes.",
  "src/app/api/admin/batch-notes/route.ts":
    "After getUser() + isAdminUser(); batch notes writes.",
  "src/app/api/admin/batches/route.ts":
    "After getUser() + isAdminUser(); batch list/create.",
  "src/app/api/admin/batches/[id]/route.ts":
    "After getUser() + isAdminUser(); batch update/activate.",
  "src/app/api/admin/daily-cap/route.ts":
    "After getUser() + isAdminUser(); daily cap read/write.",
  "src/app/api/admin/feature-flags/route.ts":
    "After getUser() + isAdminUser(); feature flag writes.",
  "src/app/api/admin/user-action/route.ts":
    "After getUser() + isAdminUser(); target userId validated as UUID before any write.",

  // ── Admin pages (server-side, already behind admin check) ────────────────
  "src/app/admin/batches/page.tsx":
    "Server component; isAdminUser() check before any DB query.",
  "src/app/admin/system/page.tsx":
    "Server component; admin-only system health page.",

  // ── Admin query modules (called only from admin-gated routes/pages) ───────
  "src/lib/admin/queries/acquisitionQueries.ts":
    "Called from admin-gated routes only; global queries intentional.",
  "src/lib/admin/queries/aiUsageQueries.ts":
    "Called from admin-gated routes only.",
  "src/lib/admin/queries/batchComparisonQueries.ts":
    "Called from admin-gated routes only.",
  "src/lib/admin/queries/conversionQueries.ts":
    "Called from admin-gated routes only.",
  "src/lib/admin/queries/engagementQueries.ts":
    "Called from admin-gated routes only.",
  "src/lib/admin/queries/examSegmentsQueries.ts":
    "Called from admin-gated routes only.",
  "src/lib/admin/queries/featureEventQueries.ts":
    "Called from admin-gated routes only.",
  "src/lib/admin/queries/featureHealthQueries.ts":
    "Called from admin-gated routes only.",
  "src/lib/admin/queries/landingVisitQueries.ts":
    "Called from admin-gated Acquisition page; landing_page_visits aggregates.",
  "src/lib/admin/queries/notificationQueries.ts":
    "Called from admin-gated routes only.",
  "src/lib/admin/queries/overviewQueries.ts":
    "Called from admin-gated routes only.",
  "src/lib/admin/queries/referralQueries.ts":
    "Called from admin-gated routes only.",
  "src/lib/admin/queries/retentionQueries.ts":
    "Called from admin-gated routes only.",
  "src/lib/admin/queries/revenueQueries.ts":
    "Called from admin-gated routes only.",
  "src/lib/admin/queries/systemHealthQueries.ts":
    "Called from admin-gated routes only.",
  "src/lib/admin/queries/userLookupQueries.ts":
    "Called from admin-gated routes only.",

  // ── Cron routes (all protected by verifyCronSecret bearer token) ─────────
  "src/app/api/cron/activate-trial-queue/route.ts":
    "Cron bearer only; activates trial queue entries (global job).",
  "src/app/api/cron/custom-reminders/route.ts":
    "Cron bearer only; sends user custom reminders.",
  "src/app/api/cron/notification-sequences/route.ts":
    "Cron bearer only; lifecycle notification sequences.",
  "src/app/api/cron/open-batches/route.ts":
    "Cron bearer only; opens scheduled batches.",
  "src/app/api/cron/refresh-leaderboard-snapshots/route.ts":
    "Cron bearer only; upserts leaderboard metrics for all users.",
  "src/app/api/cron/scheduled-notifications/route.ts":
    "Cron bearer only; sends scheduled user notifications.",
  "src/app/api/cron/sweep-prepbrain-ai-token-reservations/route.ts":
    "Cron bearer only; sweeps expired token reservations.",
  "src/app/api/cron/system-push/route.ts":
    "Cron bearer only; system-wide push notification batch.",

  // ── Shared libs ───────────────────────────────────────────────────────────
  "src/lib/admin/killSwitch.ts":
    "Reads app_config + feature_flags (no user data); called from proxy for kill-switch check.",
  "src/lib/daily-trial-cap.ts":
    "Reads daily cap config (global table, no user PII); called from subscription gate.",
  "src/lib/waitlist/batchEngine.ts":
    "isAdminUser(), openBatch(), etc. — all admin/cron operations.",
  "src/actions/adminNotifications.ts":
    "'use server'; after isAdminUser() check in all exported actions.",
  "src/actions/leaderboard.ts":
    "After getUser(); leaderboard_weekly_metrics scoped to user.id.",
  "src/proxy.ts":
    "Admin bypass check for kill switch (read-only admin_users lookup by user.id).",
};

// ── Run grep ──────────────────────────────────────────────────────────────────
const result = spawnSync(
  "grep",
  [
    "-rl",
    "--include=*.ts",
    "--include=*.tsx",
    "-e", "getSupabaseServiceRoleClient",
    "-e", "SUPABASE_SERVICE_ROLE_KEY",
    "src",
  ],
  { cwd: repoRoot, encoding: "utf8" },
);

if (result.status !== 0 && !result.stdout) {
  console.error("grep failed:", result.stderr);
  process.exit(1);
}

const found = result.stdout
  .split("\n")
  .map((f) => f.trim())
  .filter(Boolean)
  .sort();

// ── Diff ───────────────────────────────────────────────────────────────────────
const allowedSet = new Set(Object.keys(ALLOWLIST));
const undocumented = found.filter((f) => !allowedSet.has(f));
const notFound = [...allowedSet].filter(
  (f) => f !== "src/app/api/backlog-organize/route.ts" && !found.includes(f),
);

console.log(`\nService-role scope audit — ${found.length} files found, ${allowedSet.size - 1} in allowlist\n`);

if (undocumented.length > 0) {
  console.error("ERROR: The following files use the service-role client but are NOT in the allowlist:");
  for (const f of undocumented) {
    console.error(`  ✗  ${f}`);
  }
  console.error(
    "\nAdd each file to ALLOWLIST in scripts/verify-service-role-scope.mjs with a scope note,\n" +
    "then confirm that all service-role DB queries are properly scoped to user_id (or are\n" +
    "intentional global/cron/admin/webhook operations).\n",
  );
  process.exit(1);
}

if (notFound.length > 0) {
  console.warn("WARN: These allowlisted files no longer appear to use the service-role client:");
  for (const f of notFound) {
    console.warn(`  ~  ${f}`);
  }
  console.warn("Consider removing them from the allowlist to keep it accurate.\n");
}

console.log("OK: All service-role usages are documented in the allowlist.\n");
console.log("Documented files:");
for (const f of found) {
  console.log(`  ✓  ${f}`);
  if (ALLOWLIST[f]) console.log(`       ${ALLOWLIST[f]}`);
}
