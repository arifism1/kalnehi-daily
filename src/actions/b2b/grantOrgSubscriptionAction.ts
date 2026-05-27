"use server";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/waitlist/batchEngine";
import { grantOrgSubscriptionInternal } from "@/lib/b2b/orgSubscription";

export type GrantOrgSubscriptionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Grants Smart Plan (monthly, active, 35-day window) to a user by user_id.
 * Used when a platform admin directly links or invites a student to a B2B org.
 *
 * Restricted to Kalnehi platform admins.
 * The core DB write is handled by grantOrgSubscriptionInternal (importable by
 * proxy.ts / cron without going through the "use server" boundary).
 */
export async function grantOrgSubscriptionAction(
  userId: string,
): Promise<GrantOrgSubscriptionResult> {
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
    await grantOrgSubscriptionInternal(serviceClient, userId);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    return { ok: false, error: message };
  }
}
