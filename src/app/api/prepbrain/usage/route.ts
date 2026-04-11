import { NextResponse } from "next/server";

import {
  buildPrepbrainUsagePayload,
  type PrepBrainTokenRow,
} from "@/lib/prepbrainTokens";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

function isProTier(raw: string | null | undefined): boolean {
  return raw === "pro" || raw === "pro_max";
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

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select(
      "subscription_status, subscription_end_date, subscription_tier, prepbrain_tokens_used, prepbrain_tokens_month",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !profile) {
    return NextResponse.json(
      { ok: false, error: "Could not load usage." },
      { status: 500 },
    );
  }

  const paid = isCurrentlyPaid(
    profile.subscription_status ?? null,
    profile.subscription_end_date ?? null,
  );
  const tier = profile.subscription_tier ?? null;
  if (!paid || !isProTier(tier)) {
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
