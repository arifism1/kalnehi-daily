import { getAllAdminConfig } from "@/lib/waitlist/batchEngine";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminConfigClient } from "@/components/admin/AdminConfigClient";

export const dynamic = "force-dynamic";

const CONFIG_DESCRIPTIONS: Record<string, string> = {
  batch_size: "Max users per batch",
  batch_cycle_days: "Days between batch openings",
  trial_duration_days: "Free trial duration (days)",
  free_token_allocation: "AI tokens for free trial",
  free_voice_seconds: "Voice seconds for free trial (720 = 12 min)",
  smart_trial_price_inr: "₹19 waitlist skip price (INR)",
  smart_plan_monthly_price_inr: "Smart Plan monthly price (INR)",
  smart_plan_annual_price_inr: "Smart Plan annual price (INR)",
  smart_plan_tokens_monthly: "AI tokens per month on Smart Plan",
  smart_plan_voice_minutes_monthly: "Voice minutes per month on Smart Plan",
  retargeting_d7_enabled: "Send D7 retargeting email (true/false)",
  retargeting_d14_enabled: "Send D14 retargeting email (true/false)",
  skip_cta_show_threshold_days: "Min wait days to show ₹19 skip CTA",
  skip_cta_primary_threshold_days: "Min wait days to make ₹19 skip the primary CTA",
  max_waitlist_skip_per_user: "Max ₹19 skips per user (abuse prevention)",
};

export default async function AdminConfigPage() {
  // Verify identity before fetching any sensitive data.
  // (AdminLayout also enforces this, but defense-in-depth matters.)
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const config = await getAllAdminConfig();

  return (
    <AdminConfigClient
      config={config}
      descriptions={CONFIG_DESCRIPTIONS}
      userId={user?.id ?? ""}
    />
  );
}
