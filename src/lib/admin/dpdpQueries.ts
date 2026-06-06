import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export type AdminDpdpRightsRow = {
  id: string;
  reference_id: string;
  user_id: string;
  type: string;
  status: string;
  due_at: string;
  created_at: string;
  resolved_at: string | null;
  request_details: Record<string, unknown>;
  user_email: string | null;
};

export async function listDpdpRightsRequestsForAdmin(): Promise<AdminDpdpRightsRow[]> {
  const svc = getSupabaseServiceRoleClient();
  if (!svc) return [];

  const { data, error } = await svc
    .from("dpdp_rights_requests")
    .select(
      "id, reference_id, user_id, type, status, due_at, created_at, resolved_at, request_details",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) {
    console.error("[listDpdpRightsRequestsForAdmin]", error?.message);
    return [];
  }

  const userIds = [...new Set(data.map((r) => r.user_id))];
  const emailByUser = new Map<string, string>();

  if (userIds.length > 0) {
    await Promise.all(
      userIds.map(async (uid) => {
        const { data: authData } = await svc.auth.admin.getUserById(uid);
        if (authData.user?.email) {
          emailByUser.set(uid, authData.user.email);
        }
      }),
    );
  }

  return data.map((row) => ({
    ...row,
    request_details: (row.request_details as Record<string, unknown>) ?? {},
    user_email: emailByUser.get(row.user_id) ?? null,
  }));
}

export type AdminDpdpBreachRow = {
  id: string;
  reported_at: string;
  affected_count: number;
  description: string;
  board_notified_at: string | null;
  principal_notified_at: string | null;
  status: string;
  created_at: string;
};

export async function listDpdpBreachIncidentsForAdmin(): Promise<AdminDpdpBreachRow[]> {
  const svc = getSupabaseServiceRoleClient();
  if (!svc) return [];

  const { data, error } = await svc
    .from("dpdp_breach_incidents")
    .select(
      "id, reported_at, affected_count, description, board_notified_at, principal_notified_at, status, created_at",
    )
    .order("reported_at", { ascending: false })
    .limit(50);

  if (error || !data) {
    console.error("[listDpdpBreachIncidentsForAdmin]", error?.message);
    return [];
  }

  return data;
}
