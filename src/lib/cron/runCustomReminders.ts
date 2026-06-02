import type { Messaging } from "firebase-admin/messaging";

import type { TypedServiceRole } from "@/lib/supabase/serviceRoleUntyped";

import {
  getIstCalendarDateString,
  getIstMinutesSinceMidnight,
  isWithinIstFireWindow,
  parseScheduledTimeToMinutes,
} from "@/lib/customReminders/istClock";
import {
  logAutomatedPushSent,
  logAutomatedPushSkipped,
} from "@/lib/fcm/logAutomatedPush";
import {
  refundAutomatedPushBudget,
  tryConsumeAutomatedPushBudget,
} from "@/lib/fcm/pushRateLimit";
import { sendFcmToUserTokens } from "@/lib/fcm/sendNotifications";
import { createRouteLogger } from "@/lib/logger";
import {
  enqueueNotificationJob,
  type NotificationJobRow,
} from "@/lib/notificationJobs";

const log = createRouteLogger("cron/custom-reminders");
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

export type CustomRemindersRunStats = {
  istDate: string;
  scanned: number;
  fired: number;
  sent: number;
  skipped: number;
  retriesProcessed: number;
};

async function sendOneReminder(
  admin: TypedServiceRole,
  messaging: Messaging,
  r: ReminderRow,
  istYmd: string,
): Promise<"sent" | "skipped"> {
  const rateOk = await tryConsumeAutomatedPushBudget(admin, r.user_id, istYmd);
  if (!rateOk) {
    logAutomatedPushSkipped({
      channel: "custom_reminder",
      userId: r.user_id,
      istDate: istYmd,
      reason: "daily_rate_cap",
    });
    return "skipped";
  }

  try {
    const result = await sendFcmToUserTokens(messaging, r.user_id, {
      title: r.title,
      body: r.body,
      data: { kind: "custom_reminder", reminder_id: r.id, path: "/plan" },
    });
    if (result.sent > 0) {
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
          .update({ last_fired_ist_date: istYmd, updated_at: nowIso })
          .eq("id", r.id);
      }
      return "sent";
    }
    await refundAutomatedPushBudget(admin, r.user_id, istYmd);
    return "skipped";
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    log.error("send failed", e, { reminder_id: r.id });
    await refundAutomatedPushBudget(admin, r.user_id, istYmd);
    await enqueueNotificationJob(admin, {
      type: "custom_reminder",
      payload: { reminder_id: r.id },
      error: msg,
    });
    return "skipped";
  }
}

export async function retryCustomReminderJob(
  admin: TypedServiceRole,
  messaging: Messaging,
  job: NotificationJobRow,
  istYmd: string,
): Promise<boolean> {
  const reminderId = job.payload.reminder_id;
  if (typeof reminderId !== "string") return false;

  const { data: row } = await admin
    .from("user_custom_notifications")
    .select(
      "id, user_id, title, body, scheduled_time, repeat_type, is_active, run_once_on_ist_date, last_fired_ist_date",
    )
    .eq("id", reminderId)
    .eq("is_active", true)
    .maybeSingle();

  if (!row) return false;
  const outcome = await sendOneReminder(admin, messaging, row as ReminderRow, istYmd);
  return outcome === "sent";
}

export async function runCustomRemindersCron(
  admin: TypedServiceRole,
  messaging: Messaging,
): Promise<CustomRemindersRunStats> {
  const istYmd = getIstCalendarDateString();
  const istNowMin = getIstMinutesSinceMidnight();

  const { data: rows, error } = await admin
    .from("user_custom_notifications")
    .select(
      "id, user_id, title, body, scheduled_time, repeat_type, is_active, run_once_on_ist_date, last_fired_ist_date",
    )
    .eq("is_active", true);

  if (error) {
    log.error("query failed", error);
    throw new Error("custom_reminders_query_failed");
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
      if (!target || target !== istYmd || r.last_fired_ist_date) {
        skipped += 1;
        continue;
      }
    } else {
      skipped += 1;
      continue;
    }

    const { count: tokenCount, error: tokErr } = await admin
      .from("user_push_tokens")
      .select("id", { count: "exact", head: true })
      .eq("user_id", r.user_id);
    if (tokErr || !tokenCount) {
      skipped += 1;
      continue;
    }

    const outcome = await sendOneReminder(admin, messaging, r, istYmd);
    if (outcome === "sent") {
      fired += 1;
      sent += 1;
    } else {
      skipped += 1;
    }
  }

  log.info("poll complete", { istDate: istYmd, fired, sent, skipped, scanned: (rows ?? []).length });

  return {
    istDate: istYmd,
    scanned: (rows ?? []).length,
    fired,
    sent,
    skipped,
    retriesProcessed: 0,
  };
}
