/**
 * Vercel Cron (production): system push Morning Kickstart and Evening Wind-Down.
 *
 * Schedules are defined in `vercel.json` and run on **Vercel Pro** (Hobby limits previously blocked
 * multiple daily crons). Expressions are **UTC**; IST is UTC+5:30:
 * - Morning Kickstart: 7:00 AM IST → `30 1 * * *` (01:30 UTC)
 * - Evening Wind-Down: 8:00 PM IST → `30 14 * * *` (14:30 UTC)
 *
 * Pro invokes within the scheduled minute (see Vercel cron docs). Duplicate deliveries are handled
 * by `user_system_push_dedupe` via `reserveSystemPushDedupe` / `releaseSystemPushDedupe`.
 *
 * Optional `ist=HHMM` query on cron paths is documentation only (ignored by this handler).
 */
import { type NextRequest, NextResponse } from "next/server";

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
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import {
  eveningWindDownPayload,
  firstNameFromFullName,
  morningKickstartPayload,
  SYSTEM_PUSH_KIND,
  type SystemPushKind,
} from "@/lib/systemPush/copy";
import {
  releaseSystemPushDedupe,
  reserveSystemPushDedupe,
} from "@/lib/systemPush/dedupe";
import { getIstCalendarDateString } from "@/lib/systemPush/istCalendarDate";
import { verifyCronSecret } from "@/lib/verifyCronSecret";

export const runtime = "nodejs";
export const maxDuration = 300;

type Phase = "morning" | "evening";

function fcmDataStrings(
  data: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!data) return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = String(v);
  }
  return out;
}

/**
 * Vercel Cron: GET with `Authorization: Bearer $CRON_SECRET`.
 * Query: `phase=morning` (7:00 IST) or `phase=evening` (8:00 PM IST) — see vercel.json schedules.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const phase = req.nextUrl.searchParams.get("phase") as Phase | null;
  if (phase !== "morning" && phase !== "evening") {
    return NextResponse.json(
      { error: "Invalid phase (use morning or evening)" },
      { status: 400 },
    );
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }

  const sdk = tryGetFirebaseMessaging();
  if (!sdk.ok) {
    console.error("[cron/system-push] FCM unavailable:", sdk.reason);
    return NextResponse.json(
      {
        ok: false,
        code: sdk.reason,
        error: adminFacingFcmCredentialHint(sdk.reason),
      },
      { status: 503 },
    );
  }

  const dateKey = getIstCalendarDateString();
  const kind: SystemPushKind =
    phase === "morning" ? SYSTEM_PUSH_KIND.morning : SYSTEM_PUSH_KIND.evening;

  const { data: tokenRows, error: tokErr } = await admin
    .from("user_push_tokens")
    .select("user_id");
  if (tokErr) {
    console.error("[cron/system-push] token query:", tokErr.message);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const userIds = [
    ...new Set((tokenRows ?? []).flatMap((r) => (r.user_id ? [r.user_id] : []))),
  ] as string[];

  if (userIds.length === 0) {
    return NextResponse.json({
      ok: true,
      phase,
      dateKey,
      usersNotified: 0,
      sent: 0,
      skipped: 0,
      message: "No push tokens registered.",
    });
  }

  const { data: profiles, error: profErr } = await admin
    .from("user_profiles")
    .select("user_id, full_name, system_push_notifications")
    .in("user_id", userIds);

  if (profErr) {
    console.error("[cron/system-push] profiles:", profErr.message);
    return NextResponse.json({ error: "Profile query failed" }, { status: 500 });
  }

  const profileByUser = new Map(
    (profiles ?? []).map((p) => [p.user_id as string, p]),
  );

  let sentTotal = 0;
  let usersNotified = 0;
  let skipped = 0;

  for (const uid of userIds) {
    const prof = profileByUser.get(uid);
    if (!prof) {
      skipped += 1;
      continue;
    }
    if (prof.system_push_notifications === false) {
      skipped += 1;
      continue;
    }

    // react-doctor-disable-next-line react-doctor/async-await-in-loop -- per-user sequential processing: dedupe check then rate-limit must happen atomically
    const gate = await reserveSystemPushDedupe(admin, uid, kind, dateKey);
    if (gate !== "reserved") {
      skipped += 1;
      continue;
    }

    // react-doctor-disable-next-line react-doctor/async-await-in-loop -- per-user sequential rate limit check
    const rateOk = await tryConsumeAutomatedPushBudget(admin, uid, dateKey);
    if (!rateOk) {
      await releaseSystemPushDedupe(admin, uid, kind, dateKey);
      logAutomatedPushSkipped({
        channel: phase === "morning" ? "system_push_morning" : "system_push_evening",
        userId: uid,
        istDate: dateKey,
        reason: "daily_rate_cap",
      });
      skipped += 1;
      continue;
    }

    const payload =
      phase === "morning"
        ? morningKickstartPayload(firstNameFromFullName(prof.full_name))
        : eveningWindDownPayload();

    try {
      const { sent } = await sendFcmToUserTokens(sdk.messaging, uid, {
        title: payload.title,
        body: payload.body,
        data: fcmDataStrings(payload.data),
      });
      if (sent > 0) {
        sentTotal += sent;
        usersNotified += 1;
        logAutomatedPushSent({
          channel:
            phase === "morning" ? "system_push_morning" : "system_push_evening",
          userId: uid,
          istDate: dateKey,
          sent,
        });
      } else {
        await refundAutomatedPushBudget(admin, uid, dateKey);
        await releaseSystemPushDedupe(admin, uid, kind, dateKey);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      console.error("[cron/system-push] send failed userId=", uid, msg);
      await refundAutomatedPushBudget(admin, uid, dateKey);
      await releaseSystemPushDedupe(admin, uid, kind, dateKey);
    }
  }

  console.info(
    `[cron/system-push] phase=${phase} dateKey=${dateKey} usersNotified=${usersNotified} sent=${sentTotal} skipped=${skipped}`,
  );

  return NextResponse.json({
    ok: true,
    phase,
    dateKey,
    usersNotified,
    sent: sentTotal,
    skipped,
  });
}
