/**
 * TEMPORARY (Vercel Hobby/Pro): Cron schedules are cleared in `vercel.json` and this
 * route short-circuits so deployments are not blocked by cron frequency limits.
 * Re-enable: restore `vercel.json` crons (see below) and set `SYSTEM_PUSH_CRON_TEMPORARILY_DISABLED` to `false`.
 *
 * Previous `vercel.json` entries (paste back into `"crons": [ ... ]`):
 * - { "path": "/api/cron/system-push?phase=morning",  "schedule": "30 1 * * *" }
 * - { "path": "/api/cron/system-push?phase=evening", "schedule": "30 14 * * *" }
 * - { "path": "/api/cron/custom-reminders", "schedule": "* /5 * * * *" } (remove space: every 5 min)
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

const SYSTEM_PUSH_CRON_TEMPORARILY_DISABLED = true;

export const runtime = "nodejs";
export const maxDuration = 300;

function verifyCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

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
  if (SYSTEM_PUSH_CRON_TEMPORARILY_DISABLED) {
    return NextResponse.json(
      {
        ok: false,
        disabled: true,
        message:
          "System push cron is temporarily disabled (Vercel cron limits). Notification code is unchanged; re-enable in vercel.json and route flag.",
      },
      { status: 503 },
    );
  }

  if (!verifyCron(req)) {
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
    ...new Set((tokenRows ?? []).map((r) => r.user_id).filter(Boolean)),
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

    const gate = await reserveSystemPushDedupe(admin, uid, kind, dateKey);
    if (gate !== "reserved") {
      skipped += 1;
      continue;
    }

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
