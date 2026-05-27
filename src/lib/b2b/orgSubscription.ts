/**
 * Shared internal helpers for B2B subscription grant / revoke.
 *
 * These are plain functions that accept an already-constructed Supabase client
 * so they can be called from:
 *   - Server actions (grantOrgSubscriptionAction / revokeOrgSubscriptionAction)
 *   - proxy.ts syncOrgMembership (which builds its own adminClient)
 *   - The daily renewal cron
 *
 * NOT "use server" — importing this file does not make it a server action.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Grants Smart Plan (monthly, active) to a B2B student via service-role write.
 * Bypasses Razorpay entirely — no payment required.
 *
 * Sets subscription_end_date to NOW + 35 days so the daily renewal cron has a
 * 5-day buffer before the subscription lapses.
 * Sets has_had_trial = true so the 7-day welcome trial is not re-offered.
 * Clears razorpay_subscription_id / payment_grace_until so the student is never
 * charged automatically.
 *
 * Safe to call multiple times (upsert on user_id — idempotent).
 */
export async function grantOrgSubscriptionInternal(
  serviceClient: SupabaseClient,
  userId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const thirtyFiveDaysFromNow = new Date(
    Date.now() + 35 * 24 * 60 * 60 * 1000,
  ).toISOString();

  await serviceClient.from("user_profiles").upsert(
    {
      user_id: userId,
      subscription_status: "active",
      subscription_plan: "monthly",
      subscription_tier: "pro",
      subscription_start_date: now,
      subscription_end_date: thirtyFiveDaysFromNow,
      razorpay_subscription_id: null,
      payment_grace_until: null,
      has_had_trial: true,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );
}

/**
 * Revokes a B2B student's subscription when they are removed from an org.
 *
 * Safety guard: if the user has a Razorpay subscription ID we do NOT touch
 * their subscription — they are self-paying and the mandate continues normally.
 */
export async function revokeOrgSubscriptionInternal(
  serviceClient: SupabaseClient,
  userId: string,
): Promise<void> {
  const { data: profile } = await serviceClient
    .from("user_profiles")
    .select("razorpay_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();

  // If the user has a live Razorpay mandate, don't touch their subscription.
  const p = profile as { razorpay_subscription_id?: string | null } | null;
  if (p?.razorpay_subscription_id) return;

  await serviceClient
    .from("user_profiles")
    .update({
      subscription_status: "cancelled",
      subscription_end_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}
