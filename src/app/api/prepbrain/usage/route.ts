import { NextResponse } from "next/server";

import { isFreeTrialWindowActive } from "@/lib/freeTrial";
import { buildPrepbrainUsageDisplayPayload } from "@/lib/prepbrainTokenAccounting";
import { prepbrainMonthKeyFromSubscriptionStart } from "@/lib/subscriptionUsage";
import {
  prepbrainCalendarMonthKey,
  resolveAiUsagePhase,
  type PrepBrainTokenRow,
} from "@/lib/prepbrainTokens";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { USER_ERROR } from "@/lib/userFacingErrors";
import type { Tables } from "@/types/supabase";

export const runtime = "nodejs";

/** Columns needed for usage display only (avoid select("*") on user_profiles). */
type UsageProfileRow = Pick<
  Tables<"user_profiles">,
  | "subscription_status"
  | "subscription_start_date"
  | "subscription_end_date"
  | "trial_started_at"
  | "ai_tokens_used"
  | "ai_tokens_month"
  | "welcome_ai_tokens_used"
  | "paid_trial_ai_tokens_used"
  | "bonus_ai_tokens_ledger"
>;

function isCurrentlyPaid(
  status: string | null,
  endDate: string | null,
): boolean {
  if (
    status !== "trial" &&
    status !== "active" &&
    status !== "cancelled"
  ) {
    return false;
  }
  if (!endDate) return false;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return false;
  return end.getTime() > Date.now();
}

/**
 * GET /api/prepbrain/usage — token usage for welcome trial, paid trial, or monthly Pro.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: USER_ERROR.session },
      { status: 401 },
    );
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, error: "Usage is temporarily unavailable." },
      { status: 503 },
    );
  }

  const { data: profileRaw, error } = await admin
    .from("user_profiles")
    .select(
      "subscription_status,subscription_start_date,subscription_end_date,trial_started_at,ai_tokens_used,ai_tokens_month,welcome_ai_tokens_used,paid_trial_ai_tokens_used,bonus_ai_tokens_ledger",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const profile = profileRaw as UsageProfileRow | null;

  if (error) {
    console.error(
      "[prepbrain/usage] profile read failed",
      error.code,
      error.message,
      error.details,
    );
    return NextResponse.json(
      { ok: false, error: "Could not load usage." },
      { status: 500 },
    );
  }

  if (!profile) {
    return NextResponse.json(
      { ok: false, error: "No profile found." },
      { status: 403 },
    );
  }

  const paid = isCurrentlyPaid(
    profile.subscription_status ?? null,
    profile.subscription_end_date ?? null,
  );
  const trialStarted =
    typeof profile.trial_started_at === "string" ? profile.trial_started_at : null;
  const welcomeTrialActive =
    Boolean(trialStarted) && !paid && isFreeTrialWindowActive(trialStarted);

  const phase = resolveAiUsagePhase({
    hasPaidSubscriptionAccess: paid,
    subscriptionStatus: profile.subscription_status ?? null,
    welcomeTrialActive,
  });

  if (phase === "none") {
    return NextResponse.json(
      { ok: false, error: "Mastermind usage is available during your free trial or with Smart Plan." },
      { status: 403 },
    );
  }

  const now = new Date();
  const monthKey =
    phase === "monthly"
      ? prepbrainMonthKeyFromSubscriptionStart(profile.subscription_start_date ?? null, now)
      : prepbrainCalendarMonthKey(now);
  const tokenRow: PrepBrainTokenRow = {
    ai_tokens_used: profile.ai_tokens_used,
    ai_tokens_month: profile.ai_tokens_month,
    welcome_ai_tokens_used:
      typeof profile.welcome_ai_tokens_used === "number"
        ? profile.welcome_ai_tokens_used
        : 0,
    paid_trial_ai_tokens_used:
      typeof profile.paid_trial_ai_tokens_used === "number"
        ? profile.paid_trial_ai_tokens_used
        : 0,
  };

  const usage = buildPrepbrainUsageDisplayPayload(
    phase,
    tokenRow,
    monthKey,
    profile.bonus_ai_tokens_ledger,
    now,
  );

  return NextResponse.json(
    { ok: true, usage, phase },
    {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      },
    },
  );
}
