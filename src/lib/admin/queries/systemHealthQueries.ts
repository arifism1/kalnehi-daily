import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export type SystemHealthSnapshot = {
  dbPingMs: number | null;
  dbError: string | null;
  adminConfigCronKeys: { key: string; value: string }[];
  vercelHint: string;
  razorpayWebhookNote: string;
};

export async function getSystemHealthSnapshot(): Promise<SystemHealthSnapshot | null> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return null;

  const t0 = performance.now();
  let dbPingMs: number | null = null;
  let dbError: string | null = null;
  try {
    const { error } = await admin.from("admin_config").select("key").limit(1);
    if (error) dbError = error.message;
    else dbPingMs = Math.round(performance.now() - t0);
  } catch (e) {
    dbError = e instanceof Error ? e.message : "unknown";
  }

  const { data: cfg } = await admin.from("admin_config").select("key, value");
  const rows = (cfg ?? []) as { key: string; value: string }[];
  const adminConfigCronKeys = rows.filter(
    (r) => r.key.startsWith("cron_last_run_") || r.key.includes("cron"),
  );

  const vercelHint =
    process.env.VERCEL_ACCESS_TOKEN
      ? "VERCEL_ACCESS_TOKEN is set — extend this view with deployment API metrics if needed."
      : "Set VERCEL_ACCESS_TOKEN to enable deployment-level error metrics from the Vercel API.";

  return {
    dbPingMs,
    dbError,
    adminConfigCronKeys: adminConfigCronKeys.slice(0, 30),
    vercelHint,
    razorpayWebhookNote:
      "Inspect payment failures in Razorpay Dashboard → Payments; webhook delivery is logged server-side in production logs.",
  };
}
