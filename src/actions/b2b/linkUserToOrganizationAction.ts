"use server";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/waitlist/batchEngine";
import { grantOrgSubscriptionInternal } from "@/lib/b2b/orgSubscription";

export type LinkUserInput = {
  /** The user to link (by their auth user_id). */
  userId: string;
  organizationId: string;
  batchId?: string | null;
  role?: "student" | "faculty" | "admin" | "parent";
};

export type LinkUserResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Links a Kalnehi user to an organization and immediately syncs
 * app_metadata.organization_id so their next request carries the correct JWT
 * claim (no 1-hour wait for natural JWT expiry).
 *
 * Restricted to Kalnehi platform admins.
 */
export async function linkUserToOrganizationAction(
  input: LinkUserInput,
): Promise<LinkUserResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const isAdmin = await isAdminUser(user.id, user.email ?? undefined);
  if (!isAdmin) return { ok: false, error: "Forbidden." };

  const serviceClient = getSupabaseServiceRoleClient();
  if (!serviceClient) return { ok: false, error: "Service unavailable." };

  // Upsert membership row.
  const { error: membershipErr } = await serviceClient
    .from("user_organization_memberships")
    .upsert(
      {
        user_id: input.userId,
        organization_id: input.organizationId,
        batch_id: input.batchId ?? null,
        role: input.role ?? "student",
      },
      { onConflict: "user_id,organization_id" },
    );

  if (membershipErr) return { ok: false, error: membershipErr.message };

  // Immediately sync app_metadata so the user's next JWT carries the org claim.
  await serviceClient.auth.admin.updateUserById(input.userId, {
    app_metadata: { organization_id: input.organizationId },
  });

  // Grant Smart Plan access — B2B students don't pay; the org covers their access.
  await grantOrgSubscriptionInternal(serviceClient, input.userId);

  return { ok: true };
}
