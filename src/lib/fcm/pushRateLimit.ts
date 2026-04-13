import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/supabase";

/** Max automated product pushes per user per IST calendar day (system + custom + danger). */
export const AUTOMATED_PUSH_DAILY_CAP = 5;

/**
 * Atomically reserves one slot if under the daily cap. Returns false at cap.
 * Call before FCM send; call {@link refundAutomatedPushBudget} if send returns 0.
 */
export async function tryConsumeAutomatedPushBudget(
  admin: SupabaseClient<Database>,
  userId: string,
  istDate: string,
  maxPerDay: number = AUTOMATED_PUSH_DAILY_CAP,
): Promise<boolean> {
  const { data, error } = await admin.rpc("try_consume_automated_push_budget", {
    p_user_id: userId,
    p_ist_date: istDate,
    p_max: maxPerDay,
  });
  if (error) {
    console.error("[push-rate-limit] try_consume failed:", error.message);
    return false;
  }
  return data === true;
}

export async function refundAutomatedPushBudget(
  admin: SupabaseClient<Database>,
  userId: string,
  istDate: string,
): Promise<void> {
  const { error } = await admin.rpc("refund_automated_push_budget", {
    p_user_id: userId,
    p_ist_date: istDate,
  });
  if (error) {
    console.error("[push-rate-limit] refund failed:", error.message);
  }
}
