import type { Messaging } from "firebase-admin/messaging";

import type { TypedServiceRole } from "@/lib/supabase/serviceRoleUntyped";

import { getIstCalendarDateString } from "@/lib/customReminders/istClock";
import {
  logAutomatedPushSent,
  logAutomatedPushSkipped,
} from "@/lib/fcm/logAutomatedPush";
import { sendFcmToUserTokens } from "@/lib/fcm/sendNotifications";
import { createRouteLogger } from "@/lib/logger";
import {
  enqueueNotificationJob,
  type NotificationJobRow,
} from "@/lib/notificationJobs";
import { computePostSendScheduledNotificationPatch } from "@/lib/scheduledNotifications/computePostSendPatch";

const log = createRouteLogger("cron/scheduled-notifications");

type ScheduledRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  next_fire_at: string;
  repeat_type: string;
  user_timezone: string;
};

export type ScheduledNotificationsRunStats = {
  istDate: string;
  scanned: number;
  fired: number;
  sent: number;
  skipped: number;
  retriesProcessed: number;
};

async function sendOneScheduled(
  admin: TypedServiceRole,
  messaging: Messaging,
  r: ScheduledRow,
  istYmd: string,
): Promise<"sent" | "skipped"> {
  const nextFireBefore = r.next_fire_at;

  try {
    const result = await sendFcmToUserTokens(messaging, r.user_id, {
      title: r.title,
      body: r.body,
      data: {
        kind: "scheduled_notification",
        notification_id: r.id,
        path: "/notifications",
      },
    });
    if (result.sent > 0) {
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
        log.error("post-send update failed", upErr, { notification_id: r.id });
      }
      return "sent";
    }

    logAutomatedPushSkipped({
      channel: "scheduled_notification",
      userId: r.user_id,
      istDate: istYmd,
      reason: "fcm_zero_sent",
    });
    return "skipped";
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    log.error("send failed", e, { notification_id: r.id });
    await enqueueNotificationJob(admin, {
      type: "scheduled_notification",
      payload: { notification_id: r.id },
      error: msg,
    });
    return "skipped";
  }
}

export async function retryScheduledNotificationJob(
  admin: TypedServiceRole,
  messaging: Messaging,
  job: NotificationJobRow,
  istYmd: string,
): Promise<boolean> {
  const notificationId = job.payload.notification_id;
  if (typeof notificationId !== "string") return false;

  const { data: row } = await admin
    .from("user_scheduled_notifications")
    .select("id, user_id, title, body, next_fire_at, repeat_type, user_timezone")
    .eq("id", notificationId)
    .eq("is_active", true)
    .maybeSingle();

  if (!row) return false;
  const outcome = await sendOneScheduled(admin, messaging, row as ScheduledRow, istYmd);
  return outcome === "sent";
}

export async function runScheduledNotificationsCron(
  admin: TypedServiceRole,
  messaging: Messaging,
): Promise<ScheduledNotificationsRunStats> {
  const istYmd = getIstCalendarDateString();
  const nowIso = new Date().toISOString();

  const { data: rows, error } = await admin
    .from("user_scheduled_notifications")
    .select("id, user_id, title, body, next_fire_at, repeat_type, user_timezone")
    .eq("is_active", true)
    .lte("next_fire_at", nowIso);

  if (error) {
    log.error("query failed", error);
    throw new Error("scheduled_notifications_query_failed");
  }

  const list = rows ?? [];
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
      logAutomatedPushSkipped({
        channel: "scheduled_notification",
        userId: r.user_id,
        istDate: istYmd,
        reason: "no_push_tokens",
      });
      skipped += 1;
      continue;
    }

    const outcome = await sendOneScheduled(admin, messaging, r, istYmd);
    if (outcome === "sent") {
      fired += 1;
      sent += 1;
    } else {
      skipped += 1;
    }
  }

  log.info("poll complete", { istDate: istYmd, fired, sent, skipped, scanned: list.length });

  return {
    istDate: istYmd,
    scanned: list.length,
    fired,
    sent,
    skipped,
    retriesProcessed: 0,
  };
}
