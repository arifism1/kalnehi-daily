"use server";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/waitlist/batchEngine";
import type { BatchRow, MemberRow } from "@/app/admin/organizations/page";

export type InviteRow = {
  id: string;
  email: string;
  full_name: string | null;
  batch_id: string | null;
  role: string;
  invited_at: string;
};

export type OrgDetailsResult =
  | { ok: true; batches: BatchRow[]; members: MemberRow[]; invitations: InviteRow[] }
  | { ok: false; error: string };

/** Loads batches and full member list for a single org. Platform-admin only. */
export async function getOrgDetailsAction(
  orgId: string,
): Promise<OrgDetailsResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated." };

  const isAdmin = await isAdminUser(user.id, user.email ?? undefined);
  if (!isAdmin) return { ok: false, error: "Forbidden." };

  const serviceClient = getSupabaseServiceRoleClient();
  if (!serviceClient) return { ok: false, error: "Service unavailable." };

  const [batchesRes, membershipsRes, invitesRes] = await Promise.all([
    serviceClient
      .from("org_batches")
      .select("id, organization_id, name, exam_type, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true }),

    serviceClient
      .from("user_organization_memberships")
      .select("user_id, organization_id, batch_id, role, joined_at")
      .eq("organization_id", orgId)
      .order("joined_at", { ascending: false }),

    serviceClient
      .from("org_email_invitations")
      .select("id, email, full_name, batch_id, role, invited_at")
      .eq("organization_id", orgId)
      .is("accepted_at", null)
      .order("invited_at", { ascending: false }),
  ]);

  if (batchesRes.error) return { ok: false, error: batchesRes.error.message };
  if (membershipsRes.error)
    return { ok: false, error: membershipsRes.error.message };

  const invitations: InviteRow[] = (invitesRes.data ?? []).map((r) => ({
    id: r.id,
    email: r.email,
    full_name: r.full_name,
    batch_id: r.batch_id,
    role: r.role,
    invited_at: r.invited_at,
  }));

  const batches: BatchRow[] = batchesRes.data ?? [];
  const memberships = membershipsRes.data ?? [];

  if (memberships.length === 0) {
    return { ok: true, batches, members: [], invitations };
  }

  const userIds = memberships.map((m) => m.user_id);
  const batchMap = new Map(batches.map((b) => [b.id, b.name]));

  // Fetch full names from user_profiles.
  const profilesRes = await serviceClient
    .from("user_profiles")
    .select("user_id, full_name")
    .in("user_id", userIds);

  const nameMap = new Map<string, string | null>();
  for (const p of profilesRes.data ?? []) {
    if (p.user_id) nameMap.set(p.user_id, p.full_name);
  }

  // Fetch emails via Admin REST API in parallel chunks of 25.
  const CHUNK = 25;
  const emailMap = new Map<string, string | null>();

  const chunks: string[][] = [];
  for (let i = 0; i < userIds.length; i += CHUNK) {
    chunks.push(userIds.slice(i, i + CHUNK));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (supabaseUrl && serviceKey) {
    await Promise.all(
      chunks.map(async (chunk) => {
        await Promise.all(
          chunk.map(async (uid) => {
            try {
              const res = await fetch(
                `${supabaseUrl}/auth/v1/admin/users/${uid}`,
                {
                  headers: {
                    Authorization: `Bearer ${serviceKey}`,
                    apikey: serviceKey,
                  },
                  cache: "no-store",
                },
              );
              if (res.ok) {
                const u = (await res.json()) as { email?: string };
                emailMap.set(uid, u.email ?? null);
              }
            } catch {
              // silently skip — email shows as null in the table
            }
          }),
        );
      }),
    );
  }

  const members: MemberRow[] = memberships.map((m) => ({
    user_id: m.user_id,
    organization_id: m.organization_id,
    batch_id: m.batch_id,
    batch_name: m.batch_id ? (batchMap.get(m.batch_id) ?? null) : null,
    role: m.role,
    joined_at: m.joined_at,
    full_name: nameMap.get(m.user_id) ?? null,
    email: emailMap.get(m.user_id) ?? null,
  }));

  return { ok: true, batches, members, invitations };
}
