"use server";

import { getOrgContext } from "@/lib/auth/withOrganization";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export interface StudentRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  batch_id: string | null;
  batch_name: string | null;
  joined_at: string;
}

/**
 * Returns all students belonging to the given org (optionally filtered by
 * batch). Requires an active org context (caller must be admin or faculty).
 */
export async function getBatchStudents({
  orgId,
  batchId,
}: {
  orgId: string;
  batchId?: string | null;
}): Promise<StudentRow[]> {
  const ctx = await getOrgContext();
  if (!ctx || ctx.orgId !== orgId) return [];
  if (ctx.role !== "admin" && ctx.role !== "faculty") return [];

  const serviceClient = getSupabaseServiceRoleClient();
  if (!serviceClient) return [];

  // 1. Fetch membership rows (no embedded user_profiles — no direct FK exists
  //    between user_organization_memberships and user_profiles via PostgREST).
  let query = serviceClient
    .from("user_organization_memberships")
    .select("user_id, batch_id, joined_at, org_batches(name)")
    .eq("organization_id", orgId)
    .eq("role", "student");

  if (batchId) {
    query = query.eq("batch_id", batchId);
  }

  const { data: memberships } = await query;
  if (!memberships || memberships.length === 0) return [];

  const userIds = memberships.map((m) => m.user_id);

  // 2. Fetch full_name from user_profiles in a single IN query.
  const { data: profileRows } = await serviceClient
    .from("user_profiles")
    .select("id, full_name")
    .in("id", userIds);

  const profileMap = new Map<string, string | null>(
    (profileRows ?? []).map((p) => [p.id, p.full_name ?? null]),
  );

  // 3. Fetch auth emails in parallel chunks of 50 (Admin API limit per call).
  const emailMap = new Map<string, string>();
  const chunkSize = 50;
  for (let i = 0; i < userIds.length; i += chunkSize) {
    const chunk = userIds.slice(i, i + chunkSize);
    const results = await Promise.all(
      chunk.map((uid) =>
        serviceClient.auth.admin.getUserById(uid).catch(() => null),
      ),
    );
    results.forEach((r, idx) => {
      const email = r?.data?.user?.email;
      if (email) emailMap.set(chunk[idx], email);
    });
  }

  return memberships.map((m) => {
    const batch = m.org_batches as { name: string } | null;
    return {
      user_id: m.user_id,
      full_name: profileMap.get(m.user_id) ?? null,
      email: emailMap.get(m.user_id) ?? null,
      batch_id: m.batch_id ?? null,
      batch_name: batch?.name ?? null,
      joined_at: m.joined_at,
    };
  });
}
