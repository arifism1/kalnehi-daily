import { getAllAdminConfig } from "@/lib/waitlist/batchEngine";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminConfigClient } from "@/components/admin/AdminConfigClient";

export const dynamic = "force-dynamic";

const CONFIG_DESCRIPTIONS: Record<string, string> = {
  batch_size: "Max users per batch",
  batch_cycle_days: "Days between batch openings",
  trial_duration_days: "Free trial duration (days)",
  free_token_allocation: "AI tokens for free trial",
  free_voice_seconds: "Voice seconds for free trial (300 = 5 min)",
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
  // AI model pricing
  ai_deepinfra_input_inr_per_m: "DeepInfra 20B — input price (₹ per 1M tokens) [auto-syncable]",
  ai_deepinfra_output_inr_per_m: "DeepInfra 20B — output price (₹ per 1M tokens) [auto-syncable]",
  ai_groq_input_inr_per_m: "Groq Llama 3.1 8B — input price (₹ per 1M tokens)",
  ai_groq_output_inr_per_m: "Groq Llama 3.1 8B — output price (₹ per 1M tokens)",
  ai_usd_to_inr_rate: "USD → INR conversion rate (used for DeepInfra price sync)",
};

export default async function AdminConfigPage() {
  // Verify identity before fetching any sensitive data.
  // (AdminLayout also enforces this, but defense-in-depth matters.)
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const config = await getAllAdminConfig();
  const deepinfraModelSlug = process.env.DEEPINFRA_CHAT_MODEL?.trim() ?? "";

  return (
    <AdminConfigClient
      config={config}
      descriptions={CONFIG_DESCRIPTIONS}
      userId={user?.id ?? ""}
      deepinfraModelSlug={deepinfraModelSlug}
    />
  );
}
