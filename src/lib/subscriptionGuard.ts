/**
 * Server-side subscription access guard for premium server actions.
 *
 * Import only in server actions / API routes (uses service-role client).
 * Never import in client components.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";
import { isFreeTrialWindowActive, isPaidSubscriptionAccess } from "@/lib/freeTrial";

type AccessResult = { ok: true } | { ok: false; error: string };

/**
 * Verifies that the given user currently has paid access or an active free trial.
 *
 * Reads subscription_status, subscription_end_date, trial_started_at from
 * user_profiles using the provided (authenticated or service-role) Supabase client.
 *
 * Returns { ok: false } with a user-facing error string if access is denied.
 */
export async function requirePaidOrTrialAccess(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<AccessResult> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("subscription_status, subscription_end_date, trial_started_at, payment_grace_until")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[subscriptionGuard] profile fetch error", error.message);
    return { ok: false, error: "Unable to verify subscription. Please try again." };
  }

  if (!data) {
    return { ok: false, error: "No account profile found." };
  }

  const status = data.subscription_status as string | null;
  const endDate = data.subscription_end_date as string | null;
  const trialStartedAt = data.trial_started_at as string | null;
  const paymentGraceUntil = (data as { payment_grace_until?: string | null }).payment_grace_until ?? null;

  if (isPaidSubscriptionAccess(status, endDate, paymentGraceUntil)) return { ok: true };

  // Check free trial window.
  if (isFreeTrialWindowActive(trialStartedAt)) return { ok: true };

  return {
    ok: false,
    error: "Your free trial has ended. Please upgrade to continue using this feature.",
  };
}
