import { unstable_cache } from "next/cache";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export const APP_CONFIG_CACHE_TAG = "app-config";
export const FEATURE_FLAGS_CACHE_TAG = "feature-flags";

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

export type FeatureFlag = {
  id: string;
  feature_key: string;
  enabled: boolean;
  description: string;
  disabled_message: string | null;
  updated_at: string;
  updated_by: string | null;
};

export type AppConfigLogEntry = {
  id: string;
  action: string;
  performed_by: string | null;
  performed_at: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  reason: string | null;
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

// Cached 30 seconds — the kill switch must propagate within ~30 seconds.
// Tag allows instant invalidation when an admin toggles the switch.
export const fetchAppConfig = unstable_cache(_fetchAppConfig, ["app-config"], {
  tags: [APP_CONFIG_CACHE_TAG],
  revalidate: 30,
});

async function _fetchFeatureFlags(): Promise<FeatureFlag[]> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from("feature_flags")
    .select("*")
    .order("feature_key", { ascending: true });

  if (error) {
    console.error("[killSwitch] fetchFeatureFlags error:", error.message);
    return [];
  }
  return (data ?? []) as FeatureFlag[];
}

// Cached 60 seconds.
export const fetchFeatureFlags = unstable_cache(
  _fetchFeatureFlags,
  ["feature-flags"],
  {
    tags: [FEATURE_FLAGS_CACHE_TAG],
    revalidate: 60,
  },
);

export async function fetchAppConfigLog(limit = 50): Promise<AppConfigLogEntry[]> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return [];

  const { data, error } = await admin
    .from("app_config_log")
    .select("*")
    .order("performed_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[killSwitch] fetchAppConfigLog error:", error.message);
    return [];
  }
  return (data ?? []) as AppConfigLogEntry[];
}
