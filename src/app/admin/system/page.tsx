import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchAppConfig, fetchFeatureFlags, fetchAppConfigLog } from "@/lib/admin/killSwitch";
import { AdminSystemClient } from "@/components/admin/system/AdminSystemClient";

export const dynamic = "force-dynamic";

export default async function AdminSystemPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [config, flags, auditLog] = await Promise.all([
    fetchAppConfig(),
    fetchFeatureFlags(),
    fetchAppConfigLog(50),
  ]);

  if (!config) {
    return (
      <div className="text-sm text-kal-danger-text">
        Could not load app config. Service role unavailable.
      </div>
    );
  }

  return (
    <AdminSystemClient
      config={config}
      flags={flags}
      auditLog={auditLog}
      userId={user?.id ?? ""}
    />
  );
}
