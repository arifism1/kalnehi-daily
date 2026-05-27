/**
 * White-labeling / branding helpers.
 *
 * For B2C users (organization_id = null) this always returns the default
 * Kalnehi palette — no DB call is made.
 *
 * For B2B users the org's primary_color / accent_color are fetched from the
 * `organizations` table and used as CSS variable overrides via `data-org` on
 * the layout wrapper element.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface BrandingConfig {
  primaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  orgSlug: string | null;
}

export const defaultKalnehiBranding: BrandingConfig = {
  primaryColor: "#FF7A00",
  accentColor: "#FAF7F2",
  logoUrl: null,
  orgSlug: null,
};

/**
 * Returns the branding config for the given org id, or the default Kalnehi
 * branding when orgId is null / the org row cannot be found.
 */
export async function getCurrentBranding(
  orgId: string | null,
): Promise<BrandingConfig> {
  if (!orgId) return defaultKalnehiBranding;

  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("organizations")
      .select("slug, logo_url, primary_color, accent_color")
      .eq("id", orgId)
      .single();

    if (!data) return defaultKalnehiBranding;

    return {
      primaryColor: data.primary_color ?? defaultKalnehiBranding.primaryColor,
      accentColor: data.accent_color ?? defaultKalnehiBranding.accentColor,
      logoUrl: data.logo_url ?? null,
      orgSlug: data.slug ?? null,
    };
  } catch {
    return defaultKalnehiBranding;
  }
}
