import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/waitlist/batchEngine";
import { fetchAppConfig } from "@/lib/admin/killSwitch";
import { MaintenanceScreen } from "@/components/MaintenanceScreen";

/**
 * Server component that gates the entire app behind the kill switch.
 *
 * Order of operations on every page request:
 *  1. Fetch app_config (cached 30s — updates within ~30s of admin toggle).
 *  2. If app_enabled = true → render children normally.
 *  3. If app_enabled = false → check if the current user is an admin.
 *     - Admin: render children (admins always bypass).
 *     - Non-admin / unauthenticated: render MaintenanceScreen.
 *
 * Admin check only runs when the app is disabled, so the fast path
 * (app enabled) never incurs the extra auth.users lookup.
 */
export async function KillSwitchGuard({ children }: { children: React.ReactNode }) {
  const config = await fetchAppConfig();

  // Default to live if DB is unreachable — don't accidentally lock everyone out.
  const appEnabled = config?.app_enabled ?? true;

  if (appEnabled) {
    return <>{children}</>;
  }

  // App is disabled — check if the user is an admin before showing maintenance.
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const adminOk = await isAdminUser(user.id, user.email ?? undefined);
      if (adminOk) {
        return <>{children}</>;
      }
    }
  } catch {
    // If auth check fails, fall through to show maintenance screen.
  }

  return (
    <MaintenanceScreen
      title={config?.maintenance_title ?? "Back soon."}
      message={
        config?.maintenance_message ??
        "Kalnehi Daily is temporarily unavailable. We will be back shortly."
      }
      eta={config?.maintenance_eta ?? null}
    />
  );
}
