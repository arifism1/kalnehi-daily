import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { APP_HOME_PATH } from "@/config/appRoutes";
import { isAdminUser } from "@/lib/waitlist/batchEngine";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const isAdmin = await isAdminUser(user.id, user.email ?? undefined);
  if (!isAdmin) {
    redirect(APP_HOME_PATH);
  }

  return <AdminShell>{children}</AdminShell>;
}
