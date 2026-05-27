"use server";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/waitlist/batchEngine";

export type UpdateOrganizationInput = {
  orgId: string;
  name: string;
  logo_url?: string | null;
  primary_color: string;
  accent_color: string;
  custom_domain?: string | null;
};

export type UpdateOrganizationResult =
  | { ok: true }
  | { ok: false; error: string };

/** Updates an organization's display and branding fields. Platform-admin only. */
export async function updateOrganizationAction(
  input: UpdateOrganizationInput,
): Promise<UpdateOrganizationResult> {
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
    .from("organizations")
    .update({
      name: input.name.trim(),
      logo_url: input.logo_url ?? null,
      primary_color: input.primary_color,
      accent_color: input.accent_color,
      custom_domain: input.custom_domain?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.orgId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
