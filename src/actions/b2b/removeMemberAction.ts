"use server";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/waitlist/batchEngine";
import { revokeOrgSubscriptionInternal } from "@/lib/b2b/orgSubscription";

export type RemoveMemberResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Removes a user from an organization:
 *   1. Deletes the user_organization_memberships row.
 *   2. Clears app_metadata.organization_id so their JWT claim is reset on the
 *      next request (proxy.ts will re-run syncOrgMembership and set it to null).
 * Platform-admin only.
 */
export async function removeMemberAction(
  userId: string,
  organizationId: string,
): Promise<RemoveMemberResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const isAdmin = await isAdminUser(user.id, user.email ?? undefined);
  if (!isAdmin) return { ok: false, error: "Forbidden." };

  const serviceClient = getSupabaseServiceRoleClient();
  if (!serviceClient) return { ok: false, error: "Service unavailable." };

  const { error: deleteErr } = await serviceClient
    .from("user_organization_memberships")
    .delete()
    .eq("user_id", userId)
    .eq("organization_id", organizationId);

  if (deleteErr) return { ok: false, error: deleteErr.message };

  // Clear JWT claim so the user's session reflects the removal on their next request.
  await serviceClient.auth.admin.updateUserById(userId, {
    app_metadata: { organization_id: null },
  });

  // Revoke org-granted Smart Plan (skipped if the user has a Razorpay mandate).
  await revokeOrgSubscriptionInternal(serviceClient, userId);

  return { ok: true };
}
