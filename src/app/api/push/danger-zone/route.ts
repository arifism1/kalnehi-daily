import { NextResponse } from "next/server";

import {
  adminFacingFcmCredentialHint,
  tryGetFirebaseMessaging,
} from "@/lib/fcm/admin";
import {
  logAutomatedPushSent,
  logAutomatedPushSkipped,
} from "@/lib/fcm/logAutomatedPush";
import {
  refundAutomatedPushBudget,
  tryConsumeAutomatedPushBudget,
} from "@/lib/fcm/pushRateLimit";
import { sendFcmToUserTokens } from "@/lib/fcm/sendNotifications";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { dangerZonePayload, SYSTEM_PUSH_KIND } from "@/lib/systemPush/copy";
import {
  releaseSystemPushDedupe,
  reserveSystemPushDedupe,
} from "@/lib/systemPush/dedupe";
import { getIstCalendarDateString } from "@/lib/systemPush/istCalendarDate";
import { resolveMasterTodayMetrics } from "@/lib/systemPush/masterTodayServer";

export const runtime = "nodejs";

const DANGER_THRESHOLD = 25;

/**
 * Called from the home client when Master Today is below the danger threshold.
 * Idempotent: at most one danger push per user per IST calendar day.
 */
export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getSupabaseServiceRoleClient();
    if (!admin) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
    }

    const { data: profile } = await admin
      .from("user_profiles")
      .select("system_push_notifications")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile?.system_push_notifications === false) {
      return NextResponse.json({ ok: true, skipped: true, reason: "disabled" });
    }

    const dateKey = getIstCalendarDateString();
    const metrics = await resolveMasterTodayMetrics(admin, user.id, dateKey);

    if (metrics.totalCount === 0 || metrics.percent >= DANGER_THRESHOLD) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "not_in_danger",
      });
    }

    const gate = await reserveSystemPushDedupe(
      admin,
      user.id,
      SYSTEM_PUSH_KIND.danger,
      dateKey,
    );
    if (gate === "duplicate") {
      return NextResponse.json({ ok: true, skipped: true, reason: "already_sent" });
    }
    if (gate === "error") {
      return NextResponse.json({ error: "Dedupe failed" }, { status: 500 });
    }

    const sdk = tryGetFirebaseMessaging();
    if (!sdk.ok) {
      await releaseSystemPushDedupe(
        admin,
        user.id,
        SYSTEM_PUSH_KIND.danger,
        dateKey,
      );
      return NextResponse.json(
        {
          ok: false,
          code: sdk.reason,
          error: adminFacingFcmCredentialHint(sdk.reason),
        },
        { status: 503 },
      );
    }

    const rateOk = await tryConsumeAutomatedPushBudget(admin, user.id, dateKey);
    if (!rateOk) {
      await releaseSystemPushDedupe(
        admin,
        user.id,
        SYSTEM_PUSH_KIND.danger,
        dateKey,
      );
      logAutomatedPushSkipped({
        channel: "danger_zone",
        userId: user.id,
        istDate: dateKey,
        reason: "daily_rate_cap",
      });
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "rate_limited",
      });
    }

    const payload = dangerZonePayload();
    const { sent } = await sendFcmToUserTokens(sdk.messaging, user.id, {
      title: payload.title,
      body: payload.body,
      data: payload.data
        ? Object.fromEntries(
            Object.entries(payload.data).map(([k, v]) => [k, String(v)]),
          )
        : undefined,
    });

    if (sent === 0) {
      await refundAutomatedPushBudget(admin, user.id, dateKey);
      await releaseSystemPushDedupe(
        admin,
        user.id,
        SYSTEM_PUSH_KIND.danger,
        dateKey,
      );
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "no_delivery",
      });
    }

    logAutomatedPushSent({
      channel: "danger_zone",
      userId: user.id,
      istDate: dateKey,
      sent,
      extra: {
        pct: metrics.percent,
        source: metrics.source,
      },
    });

    return NextResponse.json({ ok: true, sent });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[push/danger-zone] unhandled:", msg);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
