import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { AdminOrganizationsClient } from "@/components/admin/AdminOrganizationsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface OrgRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  custom_domain: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  student_count: number;
}

export interface BatchRow {
  id: string;
  organization_id: string;
  name: string;
  exam_type: string;
  created_at: string;
}

export interface MemberRow {
  user_id: string;
  organization_id: string;
  batch_id: string | null;
  batch_name: string | null;
  role: string;
  joined_at: string;
  full_name: string | null;
  email: string | null;
}

async function getOrgsData() {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return null;

  const [orgsRes, membershipsRes] = await Promise.all([
    admin
      .from("organizations")
      .select("id, name, slug, logo_url, primary_color, accent_color, custom_domain, settings, created_at, updated_at")
      .order("created_at", { ascending: false }),

    admin
      .from("user_organization_memberships")
      .select("organization_id, role"),
  ]);

  if (orgsRes.error || membershipsRes.error) return null;

  const countMap = new Map<string, number>();
  for (const m of membershipsRes.data ?? []) {
    if (m.role === "student") {
      countMap.set(m.organization_id, (countMap.get(m.organization_id) ?? 0) + 1);
    }
  }

  const orgs: OrgRow[] = (orgsRes.data ?? []).map((o) => ({
    ...o,
    settings: (o.settings ?? {}) as Record<string, unknown>,
    student_count: countMap.get(o.id) ?? 0,
  }));

  return orgs;
}

export default async function AdminOrganizationsPage() {
  const orgs = await getOrgsData();

  if (orgs === null) {
    return (
      <div className="p-8">
        <p className="text-sm text-[var(--kal-muted)]">
          Service role client unavailable. Check{" "}
          <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY</code>.
        </p>
      </div>
    );
  }

  return <AdminOrganizationsClient initialOrgs={orgs} />;
}
