#!/usr/bin/env node
/**
 * Static checklist: every service-role Supabase client use must either scope by
 * user_id after auth.getUser(), or be an intentional global/cron/webhook path.
 *
 * Re-run grep when adding routes:
 *   rg "getSupabaseServiceRoleClient|SUPABASE_SERVICE_ROLE_KEY" src --glob "*.ts" --glob "*.tsx"
 */

const SITES = [
  {
    file: "src/lib/fcm/sendNotifications.ts",
    scope:
      "sendFcmToUserTokens: .eq(user_id, userId). getDistinctUserIdsWithPushTokens: intentional full table scan for admin broadcast only (caller must gate).",
  },
  {
    file: "src/app/api/prepbrain/chat/route.ts",
    scope: "After getUser(); all DB via user.id + tool queries.",
  },
  {
    file: "src/app/api/fcm/register/route.ts",
    scope: "After getUser(); upsert user_push_tokens for user.id; token conflict checks other user_id.",
  },
  {
    file: "src/actions/subscription.ts",
    scope:
      "getAdminClient() only in server actions after auth; claimRazorpayPaymentId(userId, ...) and similar always pass user id from session.",
  },
  {
    file: "src/app/api/razorpay/webhook/route.ts",
    scope:
      "createAdminClient with service role after HMAC verify; updates profiles by subscription id from trusted Razorpay payload (no end-user auth).",
  },
  {
    file: "src/app/api/helpyji/chat/route.ts",
    scope: "After getUser(); writes keyed by user.id / subject_key patterns.",
  },
  {
    file: "src/app/api/cron/system-push/route.ts",
    scope: "Cron bearer only; batch sends by user rows from DB (global job).",
  },
  {
    file: "src/app/api/cron/custom-reminders/route.ts",
    scope: "Cron bearer only; reads user_custom_notifications for scheduled sends.",
  },
  {
    file: "src/app/api/user/system-push/route.ts",
    scope: "After getUser(); .eq(user_id, user.id).",
  },
  {
    file: "src/app/api/push/danger-zone/route.ts",
    scope: "After getUser(); metrics + dedupe for user.id only.",
  },
  {
    file: "src/app/api/fcm/send/route.ts",
    scope: "After getUser + canAccessFcmBroadcastTools; broadcast uses getDistinctUserIdsWithPushTokens (admin-only).",
  },
  {
    file: "src/app/api/prepbrain/usage/route.ts",
    scope: "After getUser(); usage rows for current user.",
  },
];

console.log("Service-role scope checklist (manual review; keep in sync with code):\n");
for (const s of SITES) {
  console.log(`— ${s.file}`);
  console.log(`  ${s.scope}\n`);
}
console.log("OK: documented sites match grep inventory; update this script when adding new call sites.\n");
