import { unstable_cache } from "next/cache";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export const APP_CONFIG_CACHE_TAG = "app-config";

export type AppConfig = {
  id: string;
  app_enabled: boolean;
  maintenance_message: string;
  maintenance_title: string;
  maintenance_eta: string | null;
  disabled_at: string | null;
  disabled_by: string | null;
  re_enabled_at: string | null;
  re_enabled_by: string | null;
  updated_at: string;
  daily_trial_cap: number;
  daily_cap_enabled: boolean;
  daily_cap_timezone: string;
};

async function _fetchAppConfig(): Promise<AppConfig | null> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return null;

  const { data, error } = await admin
    .from("app_config")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[killSwitch] fetchAppConfig error:", error.message);
    return null;
  }
  return data as AppConfig | null;
}

// Cached 30 seconds. Tag allows instant invalidation when an admin updates
// the daily trial cap settings stored on app_config.
export const fetchAppConfig = unstable_cache(_fetchAppConfig, ["app-config"], {
  tags: [APP_CONFIG_CACHE_TAG],
  revalidate: 30,
});
