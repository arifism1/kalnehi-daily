"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export type PwaInstallStatus = "browser" | "installed_ios" | "installed_android";
export type PwaPlatform = "ios" | "android";

export type RecordPwaStatusInput = {
  status: PwaInstallStatus;
  platform: PwaPlatform | null;
  /** true when the event is the Android beforeinstallprompt or appinstalled */
  event?: "prompt_shown" | "installed";
};

/**
 * Records the user's PWA install status in user_profiles and fires a
 * feature_event for granular funnel analysis.
 *
 * Called at most once per session by usePwaTracking.
 */
export async function recordPwaStatus(input: RecordPwaStatusInput): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const admin = getSupabaseServiceRoleClient();
  if (!admin) return;

  const now = new Date().toISOString();

  // Fetch the existing row to avoid overwriting pwa_first_opened_at.
  const { data: existing } = await admin
    .from("user_profiles")
    .select("pwa_first_opened_at")
    .eq("user_id", user.id)
    .single();

  const isStandalone =
    input.status === "installed_ios" || input.status === "installed_android";

  await admin
    .from("user_profiles")
    .update({
      pwa_install_status: input.status,
      pwa_install_platform: input.platform ?? null,
      pwa_last_opened_at: isStandalone ? now : undefined,
      pwa_first_opened_at:
        isStandalone && !existing?.pwa_first_opened_at ? now : undefined,
    })
    .eq("user_id", user.id);

  // Fire a feature_event for the install funnel.
  const eventName = input.event
    ? input.event
    : isStandalone
      ? "opened_standalone"
      : "opened_browser";

  await admin.from("feature_events").insert({
    user_id: user.id,
    feature: "pwa",
    event: eventName,
    metadata: { platform: input.platform, status: input.status },
  });
}
