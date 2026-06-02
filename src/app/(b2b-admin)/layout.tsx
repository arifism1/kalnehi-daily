import { redirect } from "next/navigation";

import { B2BAdminShell } from "@/components/b2b-admin/B2BAdminShell";
import { APP_HOME_PATH } from "@/config/appRoutes";
import { getOrgContext } from "@/lib/auth/withOrganization";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function B2BAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // getOrgContext is memoized with React cache() — no extra getUser() call here.
  // It returns null for both unauthenticated users and B2C-only users.
  const ctx = await getOrgContext();

  if (!ctx) {
    // Distinguish "not logged in" (→ /auth) from "logged in but no org" (→ app home).
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    redirect(user ? APP_HOME_PATH : "/auth");
  }

  // Only faculty and org-admins can access this dashboard.
  if (ctx.role !== "admin" && ctx.role !== "faculty") {
    redirect(APP_HOME_PATH);
  }

  // Fetch org name for the shell using the regular (RLS) client.
  // The org_members_read_own_org policy allows reads where id = get_org_id_from_jwt().
  const supabase = await createSupabaseServerClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", ctx.orgId)
    .single();

  return (
    <B2BAdminShell ctx={ctx} orgName={org?.name ?? "Institute"}>
      {children}
    </B2BAdminShell>
  );
}
