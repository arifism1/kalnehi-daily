"use server";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/waitlist/batchEngine";

export type CreateOrganizationInput = {
  name: string;
  slug: string;
  logo_url?: string | null;
  primary_color?: string;
  accent_color?: string;
  custom_domain?: string | null;
};

export type CreateOrganizationResult =
  | { ok: true; orgId: string }
  | { ok: false; error: string };

/**
 * Creates a new organization. Restricted to Kalnehi platform admins only
 * (uses the admin_users table, same as /admin routes).
 */
export async function createOrganizationAction(
  input: CreateOrganizationInput,
): Promise<CreateOrganizationResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const isAdmin = await isAdminUser(user.id, user.email ?? undefined);
  if (!isAdmin) return { ok: false, error: "Forbidden." };

  const serviceClient = getSupabaseServiceRoleClient();
  if (!serviceClient) return { ok: false, error: "Service unavailable." };

  const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");

  const { data, error } = await serviceClient
    .from("organizations")
    .insert({
      name: input.name.trim(),
      slug,
      logo_url: input.logo_url ?? null,
      primary_color: input.primary_color ?? "#FF7A00",
      accent_color: input.accent_color ?? "#FAF7F2",
      custom_domain: input.custom_domain ?? null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  return { ok: true, orgId: data.id };
}
