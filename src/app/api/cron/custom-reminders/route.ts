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
import {
  getIstCalendarDateString,
  getIstMinutesSinceMidnight,
  isWithinIstFireWindow,
  parseScheduledTimeToMinutes,
} from "@/lib/customReminders/istClock";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { verifyCronSecret } from "@/lib/verifyCronSecret";

export const runtime = "nodejs";
export const maxDuration = 300;

const FIRE_WINDOW_MINUTES = 12;

type ReminderRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  scheduled_time: string;
  repeat_type: string;
  is_active: boolean;
  run_once_on_ist_date: string | null;
  last_fired_ist_date: string | null;
};

/**
 * Vercel Cron: every 5 minutes with `Authorization: Bearer $CRON_SECRET`.
 * Sends active custom reminders whose IST wall time falls in the current window.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }

  const sdk = tryGetFirebaseMessaging();
  if (!sdk.ok) {
    console.error("[cron/custom-reminders] FCM unavailable:", sdk.reason);
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
  const istNowMin = getIstMinutesSinceMidnight();

  const { data: rows, error } = await admin
    .from("user_custom_notifications")
    .select(
      "id, user_id, title, body, scheduled_time, repeat_type, is_active, run_once_on_ist_date, last_fired_ist_date",
    )
    .eq("is_active", true);

  if (error) {
    console.error("[cron/custom-reminders] query:", error.message);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  let sent = 0;
  let fired = 0;
  let skipped = 0;

  for (const raw of rows ?? []) {
    const r = raw as ReminderRow;
    const schedMin = parseScheduledTimeToMinutes(String(r.scheduled_time));
    if (schedMin === null) {
      skipped += 1;
      continue;
    }

    if (!isWithinIstFireWindow(schedMin, istNowMin, FIRE_WINDOW_MINUTES)) {
      skipped += 1;
      continue;
    }

    if (r.repeat_type === "daily") {
      if (r.last_fired_ist_date === istYmd) {
        skipped += 1;
        continue;
      }
    } else if (r.repeat_type === "once") {
      const target = r.run_once_on_ist_date?.slice(0, 10);
      if (!target || target !== istYmd) {
        skipped += 1;
        continue;
      }
      if (r.last_fired_ist_date) {
        skipped += 1;
        continue;
      }
    } else {
      skipped += 1;
      continue;
    }

    // react-doctor-disable-next-line react-doctor/async-await-in-loop -- per-reminder sequential processing to track sent/skipped counts accurately
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
        channel: "custom_reminder",
        userId: r.user_id,
        istDate: istYmd,
        reason: "daily_rate_cap",
      });
      skipped += 1;
      continue;
    }

    try {
      const result = await sendFcmToUserTokens(sdk.messaging, r.user_id, {
        title: r.title,
        body: r.body,
        data: {
          kind: "custom_reminder",
          reminder_id: r.id,
        },
      });
      if (result.sent > 0) {
        sent += result.sent;
        fired += 1;
        logAutomatedPushSent({
          channel: "custom_reminder",
          userId: r.user_id,
          istDate: istYmd,
          sent: result.sent,
          extra: { reminder_id: r.id },
        });
        const nowIso = new Date().toISOString();
        if (r.repeat_type === "once") {
          await admin
            .from("user_custom_notifications")
            .update({
              is_active: false,
              last_fired_ist_date: istYmd,
              updated_at: nowIso,
            })
            .eq("id", r.id);
        } else {
          await admin
            .from("user_custom_notifications")
            .update({
              last_fired_ist_date: istYmd,
              updated_at: nowIso,
            })
            .eq("id", r.id);
        }
      } else {
        await refundAutomatedPushBudget(admin, r.user_id, istYmd);
        skipped += 1;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      console.error("[cron/custom-reminders] send failed id=", r.id, msg);
      await refundAutomatedPushBudget(admin, r.user_id, istYmd);
      skipped += 1;
    }
  }

  console.info(
    `[cron/custom-reminders] istDate=${istYmd} firedReminders=${fired} pushMessages=${sent} skipped=${skipped} scanned=${(rows ?? []).length}`,
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
