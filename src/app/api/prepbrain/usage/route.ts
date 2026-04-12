import { NextResponse } from "next/server";

import {
  buildPrepbrainUsagePayload,
  type PrepBrainTokenRow,
} from "@/lib/prepbrainTokens";
import { parseSubscriptionTier } from "@/lib/subscriptionTiers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { USER_ERROR } from "@/lib/userFacingErrors";

export const runtime = "nodejs";

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
 * GET /api/prepbrain/usage — current month PrepBrain token usage (Pro / Pro Max).
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

  const { data: profile, error } = await admin
    .from("user_profiles")
    .select(
      "subscription_status, subscription_end_date, subscription_tier, prepbrain_tokens_used, prepbrain_tokens_month",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[prepbrain/usage] profile read failed", error);
    return NextResponse.json(
      { ok: false, error: "Could not load usage." },
      { status: 500 },
    );
  }

  if (!profile) {
    return NextResponse.json(
      { ok: false, error: "PrepBrain usage is available on Pro or Pro Max." },
      { status: 403 },
    );
  }

  const paid = isCurrentlyPaid(
    profile.subscription_status ?? null,
    profile.subscription_end_date ?? null,
  );
  const tier = parseSubscriptionTier(profile.subscription_tier ?? undefined);
  if (!paid || (tier !== "pro" && tier !== "pro_max")) {
    return NextResponse.json(
      { ok: false, error: "PrepBrain usage is available on Pro or Pro Max." },
      { status: 403 },
    );
  }

  const row: PrepBrainTokenRow = {
    prepbrain_tokens_used: profile.prepbrain_tokens_used,
    prepbrain_tokens_month: profile.prepbrain_tokens_month,
  };

  return NextResponse.json({
    ok: true,
    usage: buildPrepbrainUsagePayload(tier, row),
  });
}

