/**
 * withOrganization — server-side helper for B2B route groups.
 *
 * Reads the organization_id forwarded by proxy.ts via the x-kalnehi-org-id
 * request header (set before the request reaches any Server Component).
 * Then fetches the user's role + batch from user_organization_memberships for
 * the current request.
 *
 * ONLY import this from (b2b-admin) layouts, pages, and server actions.
 * Never import it from (kalnehi) routes — B2C users return null here.
 */
import { cache } from "react";
import { headers } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const ORG_ID_HEADER = "x-kalnehi-org-id";

export interface OrgContext {
  orgId: string;
  role: "student" | "faculty" | "admin" | "parent";
  batchId: string | null;
}

/**
 * Returns the org context for the current authenticated user, or null if the
 * user is a pure B2C user (no organization membership).
 *
 * Wrapped with React's cache() for per-request memoization: the layout,
 * page, and any server actions called in the same request all share one
 * result — one auth round-trip + one DB query total.
 */
export const getOrgContext = cache(async (): Promise<OrgContext | null> => {
  const headersList = await headers();
  const orgId = headersList.get(ORG_ID_HEADER);

  if (!orgId) return null;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership } = await supabase
    .from("user_organization_memberships")
    .select("role, batch_id")
    .eq("user_id", user.id)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (!membership) return null;

  return {
    orgId,
    role: membership.role as OrgContext["role"],
    batchId: membership.batch_id ?? null,
  };
});

/**
 * Reads org_id from the forwarded request header without a DB round-trip.
 * Use this in (kalnehi)/layout.tsx for the data-org attribute only — no role
 * info needed there.
 */
export async function getOrgIdFromSession(): Promise<string | null> {
  const headersList = await headers();
  const orgId = headersList.get(ORG_ID_HEADER);
  return orgId ?? null;
}
