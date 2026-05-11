/**
 * POST /api/admin/feature-flags
 * Admin only.
 * Body: { feature_key: string, enabled: boolean, message?: string }
 */
import { type NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { assertSameOrigin } from "@/lib/assertSameOrigin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { isAdminUser } from "@/lib/waitlist/batchEngine";
import { FEATURE_FLAGS_CACHE_TAG } from "@/lib/admin/killSwitch";
import { writeFeatureFlag } from "@/lib/edgeConfig";

export const runtime = "nodejs";

type Body = {
  feature_key?: string;
  enabled?: boolean;
  message?: string | null;
};

export async function POST(req: NextRequest) {
  const denied = assertSameOrigin(req);
  if (denied) return denied;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const adminOk = await isAdminUser(user.id, user.email ?? undefined);
  if (!adminOk) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Service unavailable." }, { status: 503 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const featureKey = (body.feature_key ?? "").trim();
  if (!featureKey) {
    return NextResponse.json({ ok: false, error: "feature_key required." }, { status: 400 });
  }
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ ok: false, error: "enabled (boolean) required." }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Read current row for audit log.
  const { data: current } = await admin
    .from("feature_flags")
    .select("enabled, disabled_message")
    .eq("feature_key", featureKey)
    .maybeSingle();

  const old_value = current
    ? { enabled: current.enabled, disabled_message: current.disabled_message }
    : null;

  const newMessage =
    body.message !== undefined ? (body.message?.trim() || null) : (current?.disabled_message ?? null);

  const { error: updateErr } = await admin
    .from("feature_flags")
    .update({
      enabled: body.enabled,
      disabled_message: body.enabled ? null : newMessage,
      updated_at: now,
      updated_by: user.id,
    })
    .eq("feature_key", featureKey);

  if (updateErr) {
    console.error("[admin/feature-flags] update error:", updateErr);
    return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
  }

  await admin.from("app_config_log").insert({
    action: body.enabled ? `feature_enabled:${featureKey}` : `feature_disabled:${featureKey}`,
    performed_by: user.id,
    old_value,
    new_value: { enabled: body.enabled, disabled_message: body.enabled ? null : newMessage },
  });

  // Push to Edge Config — all serverless instances see the new state instantly.
  await writeFeatureFlag(featureKey, {
    enabled: body.enabled,
    message: body.enabled ? null : newMessage,
  });

  revalidateTag(FEATURE_FLAGS_CACHE_TAG, { expire: 0 });

  return NextResponse.json({ ok: true });
}
