"use server";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/waitlist/batchEngine";

export type RevokeInviteResult = { ok: true } | { ok: false; error: string };

/** Removes a pending email invitation. Platform-admin only. */
export async function revokeInviteAction(
  inviteId: string,
  organizationId: string,
): Promise<RevokeInviteResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const isAdmin = await isAdminUser(user.id, user.email ?? undefined);
  if (!isAdmin) return { ok: false, error: "Forbidden." };

  const serviceClient = getSupabaseServiceRoleClient();
  if (!serviceClient) return { ok: false, error: "Service unavailable." };

  const { error } = await serviceClient
    .from("org_email_invitations")
    .delete()
    .eq("id", inviteId)
    .eq("organization_id", organizationId); // extra guard

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
