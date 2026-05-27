/**
 * studentOrgContext — server-side helper for the (kalnehi) student layout.
 *
 * Fetches org identity (name, slug, logo, colours) plus the current user's
 * batch and role in one parallel query pair. Safe to call from
 * (kalnehi)/layout.tsx; returns null for pure B2C users.
 */
import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export interface StudentOrgSummary {
  orgId: string;
  orgName: string;
  orgSlug: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  batchName: string | null;
  role: string | null;
}

/**
 * Returns the org summary for the currently authenticated student, or null
 * when the student is not in any organisation (pure B2C path).
 *
 * Cached per request via React's cache() so the layout and any co-located
 * server components share one DB round-trip.
 */
export const getStudentOrgSummary = cache(
  async (orgId: string): Promise<StudentOrgSummary | null> => {
    try {
      const serviceClient = getSupabaseServiceRoleClient();
      if (!serviceClient) return null;

      // Need userId to look up the membership row.
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      // Run both queries in parallel.
      const [orgRes, membershipRes] = await Promise.all([
        serviceClient
          .from("organizations")
          .select("id, name, slug, logo_url, primary_color, accent_color")
          .eq("id", orgId)
          .single(),

        serviceClient
          .from("user_organization_memberships")
          .select("role, batch_id")
          .eq("user_id", user.id)
          .eq("organization_id", orgId)
          .maybeSingle(),
      ]);

      if (orgRes.error || !orgRes.data) return null;
      const org = orgRes.data;
      const membership = membershipRes.data;

      // Resolve batch name if the user is in a batch.
      let batchName: string | null = null;
      if (membership?.batch_id) {
        const { data: batch } = await serviceClient
          .from("org_batches")
          .select("name")
          .eq("id", membership.batch_id)
          .single();
        batchName = batch?.name ?? null;
      }

      return {
        orgId: org.id,
        orgName: org.name,
        orgSlug: org.slug,
        logoUrl: org.logo_url ?? null,
        primaryColor: org.primary_color ?? "#FF7A00",
        accentColor: org.accent_color ?? "#FAF7F2",
        batchName,
        role: membership?.role ?? null,
      };
    } catch {
      return null;
    }
  },
);
