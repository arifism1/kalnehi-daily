import { type NextRequest, NextResponse } from "next/server";

import { computePostSendScheduledNotificationPatch } from "@/lib/scheduledNotifications/computePostSendPatch";
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
import { getIstCalendarDateString } from "@/lib/customReminders/istClock";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export const runtime = "nodejs";
export const maxDuration = 300;

function verifyCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

type ScheduledRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  next_fire_at: string;
  repeat_type: string;
  user_timezone: string;
};

/**
 * Vercel Cron: every 5 minutes with `Authorization: Bearer $CRON_SECRET`.
 * Sends active scheduled notifications whose next_fire_at is due.
 */
export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }

  const sdk = tryGetFirebaseMessaging();
  if (!sdk.ok) {
    console.error("[cron/scheduled-notifications] FCM unavailable:", sdk.reason);
    return NextResponse.json(
      {
        ok: false,
        code: sdk.reason,
        error: adminFacingFcmCredentialHint(sdk.reason),
      },
      { status: 503 },
    );
  }

  const istYmd = getIstCalendarDateString();
  const nowIso = new Date().toISOString();

  const { data: rows, error } = await admin
    .from("user_scheduled_notifications")
    .select(
      "id, user_id, title, body, next_fire_at, repeat_type, user_timezone",
    )
    .eq("is_active", true)
    .lte("next_fire_at", nowIso);

  if (error) {
    console.error("[cron/scheduled-notifications] query:", error.message);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  let sent = 0;
  let fired = 0;
  let skipped = 0;

  for (const raw of rows ?? []) {
    const r = raw as ScheduledRow;

    const { count: tokenCount, error: tokErr } = await admin
      .from("user_push_tokens")
      .select("id", { count: "exact", head: true })
      .eq("user_id", r.user_id);
    if (tokErr || !tokenCount) {
      skipped += 1;
      continue;
    }

    const rateOk = await tryConsumeAutomatedPushBudget(admin, r.user_id, istYmd);
    if (!rateOk) {
      logAutomatedPushSkipped({
        channel: "scheduled_notification",
        userId: r.user_id,
        istDate: istYmd,
        reason: "daily_rate_cap",
      });
      skipped += 1;
      continue;
    }

    const nextFireBefore = r.next_fire_at;

    try {
      const result = await sendFcmToUserTokens(sdk.messaging, r.user_id, {
        title: r.title,
        body: r.body,
        data: {
          kind: "scheduled_notification",
          notification_id: r.id,
          path: "/notification",
        },
      });
      if (result.sent > 0) {
        sent += result.sent;
        fired += 1;
        logAutomatedPushSent({
          channel: "scheduled_notification",
          userId: r.user_id,
          istDate: istYmd,
          sent: result.sent,
          extra: { notification_id: r.id },
        });

        const patch = computePostSendScheduledNotificationPatch(
          r.repeat_type,
          nextFireBefore,
          r.user_timezone,
        );

        const { error: upErr } = await admin
          .from("user_scheduled_notifications")
          .update(patch)
          .eq("id", r.id)
          .eq("next_fire_at", nextFireBefore);

        if (upErr) {
          console.error(
            "[cron/scheduled-notifications] update failed id=",
            r.id,
            upErr.message,
          );
        }
      } else {
        await refundAutomatedPushBudget(admin, r.user_id, istYmd);
        skipped += 1;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      console.error("[cron/scheduled-notifications] send failed id=", r.id, msg);
      await refundAutomatedPushBudget(admin, r.user_id, istYmd);
      skipped += 1;
    }
  }

  console.info(
    `[cron/scheduled-notifications] istDate=${istYmd} fired=${fired} pushMessages=${sent} skipped=${skipped} scanned=${(rows ?? []).length}`,
  );

  return NextResponse.json({
    ok: true,
    istDate: istYmd,
    scanned: (rows ?? []).length,
    fired,
    sent,
    skipped,
  });
}
