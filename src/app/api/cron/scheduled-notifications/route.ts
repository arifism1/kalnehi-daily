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
import { sendFcmToUserTokens } from "@/lib/fcm/sendNotifications";
import { getIstCalendarDateString } from "@/lib/customReminders/istClock";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { verifyCronSecret } from "@/lib/verifyCronSecret";

const LOG_PREFIX = "[cron/scheduled-notifications]";

/** Cap how many due row ids we print in one log line (avoid huge payloads). */
const MAX_IDS_IN_SCAN_LOG = 40;

export const runtime = "nodejs";
export const maxDuration = 300;

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
 *
 * User-scheduled reminders do not consume the shared automated-push daily cap
 * (system / custom / danger-zone); they always attempt FCM when due.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    console.warn(
      `${LOG_PREFIX} unauthorized (missing CRON_SECRET env or Authorization Bearer mismatch)`,
    );
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    console.error(
      `${LOG_PREFIX} service role unavailable (check SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL)`,
    );
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }

  const sdk = tryGetFirebaseMessaging();
  if (!sdk.ok) {
    console.error(`${LOG_PREFIX} FCM unavailable:`, sdk.reason);
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
    console.error(`${LOG_PREFIX} query failed:`, error.message);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const list = rows ?? [];
  const dueIds = list.map((r) => (r as ScheduledRow).id);
  const idsForLog =
    dueIds.length <= MAX_IDS_IN_SCAN_LOG
      ? dueIds
      : dueIds.slice(0, MAX_IDS_IN_SCAN_LOG);

  console.info(
    `${LOG_PREFIX} run start nowIso=${nowIso} istDate=${istYmd} scanned=${list.length} dueIds=${JSON.stringify(idsForLog)}${dueIds.length > MAX_IDS_IN_SCAN_LOG ? ` (+${dueIds.length - MAX_IDS_IN_SCAN_LOG} more)` : ""}`,
  );

  let sent = 0;
  let fired = 0;
  let skipped = 0;

  for (const raw of list) {
    const r = raw as ScheduledRow;

    const { count: tokenCount, error: tokErr } = await admin
      .from("user_push_tokens")
      .select("id", { count: "exact", head: true })
      .eq("user_id", r.user_id);
    if (tokErr || !tokenCount) {
      console.info(
        `${LOG_PREFIX} skip notification_id=${r.id} user_id=${r.user_id} reason=no_push_tokens tokErr=${tokErr?.message ?? "none"}`,
      );
      logAutomatedPushSkipped({
        channel: "scheduled_notification",
        userId: r.user_id,
        istDate: istYmd,
        reason: "no_push_tokens",
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
        console.info(
          `${LOG_PREFIX} sent notification_id=${r.id} user_id=${r.user_id} devices=${result.sent}`,
        );
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
            `${LOG_PREFIX} update failed notification_id=${r.id}`,
            upErr.message,
          );
        }
      } else {
        console.warn(
          `${LOG_PREFIX} skip notification_id=${r.id} user_id=${r.user_id} reason=fcm_zero_sent failures=${JSON.stringify(result.failures)}`,
        );
        logAutomatedPushSkipped({
          channel: "scheduled_notification",
          userId: r.user_id,
          istDate: istYmd,
          reason: "fcm_zero_sent",
        });
        skipped += 1;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      console.error(
        `${LOG_PREFIX} send_error notification_id=${r.id} user_id=${r.user_id}`,
        msg,
      );
      logAutomatedPushSkipped({
        channel: "scheduled_notification",
        userId: r.user_id,
        istDate: istYmd,
        reason: "send_error",
      });
      skipped += 1;
    }
  }

  console.info(
    `${LOG_PREFIX} run end istDate=${istYmd} fired=${fired} pushMessages=${sent} skipped=${skipped} scanned=${list.length}`,
  );

  return NextResponse.json({
    ok: true,
    istDate: istYmd,
    scanned: list.length,
    fired,
    sent,
    skipped,
  });
}
