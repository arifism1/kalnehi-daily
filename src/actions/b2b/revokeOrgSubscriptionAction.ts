"use server";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/waitlist/batchEngine";
import { revokeOrgSubscriptionInternal } from "@/lib/b2b/orgSubscription";

export type RevokeOrgSubscriptionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Revokes a user's org-granted Smart Plan when they are removed from a B2B org.
 *
 * Safety: if the user has a live Razorpay mandate, this is a no-op — the
 * subscription continues normally and they will not be double-charged.
 *
 * Restricted to Kalnehi platform admins.
 */
export async function revokeOrgSubscriptionAction(
  userId: string,
): Promise<RevokeOrgSubscriptionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const isAdmin = await isAdminUser(user.id, user.email ?? undefined);
  if (!isAdmin) return { ok: false, error: "Forbidden." };

  const serviceClient = getSupabaseServiceRoleClient();
  if (!serviceClient) return { ok: false, error: "Service unavailable." };

  try {
    await revokeOrgSubscriptionInternal(serviceClient, userId);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    return { ok: false, error: message };
  }
}
