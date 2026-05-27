import { type NextRequest, NextResponse } from "next/server";

import { getIstCalendarDateString } from "@/lib/customReminders/istClock";
import { runCustomRemindersCron, retryCustomReminderJob } from "@/lib/cron/runCustomReminders";
import {
  runScheduledNotificationsCron,
  retryScheduledNotificationJob,
} from "@/lib/cron/runScheduledNotifications";
import {
  adminFacingFcmCredentialHint,
  tryGetFirebaseMessaging,
} from "@/lib/fcm/admin";
import { createRouteLogger } from "@/lib/logger";
import {
  claimDueNotificationJobs,
  markNotificationJobDone,
  markNotificationJobFailed,
} from "@/lib/notificationJobs";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { verifyCronSecret } from "@/lib/verifyCronSecret";

export const runtime = "nodejs";
export const maxDuration = 300;

const log = createRouteLogger("cron/notification-worker");

/**
 * Vercel Cron: every 5 minutes. Processes retry queue, custom reminders, and scheduled notifications.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    log.error("service role unavailable");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }

  const sdk = tryGetFirebaseMessaging();
  if (!sdk.ok) {
    log.error("FCM unavailable", undefined, { reason: sdk.reason });
    return NextResponse.json(
      {
        ok: false,
        code: sdk.reason,
        error: adminFacingFcmCredentialHint(sdk.reason),
      },
      { status: 503 },
    );
  }

  let retriesOk = 0;
  let retriesFailed = 0;
  const istYmd = getIstCalendarDateString();

  const jobs = await claimDueNotificationJobs(admin);
  for (const job of jobs) {
    try {
      const ok =
        job.type === "custom_reminder"
          ? await retryCustomReminderJob(admin, sdk.messaging, job, istYmd)
          : await retryScheduledNotificationJob(admin, sdk.messaging, job, istYmd);
      if (ok) {
        await markNotificationJobDone(admin, job.id);
        retriesOk += 1;
      } else {
        await markNotificationJobFailed(admin, job, "retry_send_failed");
        retriesFailed += 1;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      await markNotificationJobFailed(admin, job, msg);
      retriesFailed += 1;
    }
  }

  const custom = await runCustomRemindersCron(admin, sdk.messaging);
  const scheduled = await runScheduledNotificationsCron(admin, sdk.messaging);

  custom.retriesProcessed = retriesOk;
  scheduled.retriesProcessed = retriesOk;

  log.info("run complete", {
    retriesOk,
    retriesFailed,
    custom,
    scheduled,
  });

  return NextResponse.json({
    ok: true,
    retries: { ok: retriesOk, failed: retriesFailed, claimed: jobs.length },
    customReminders: custom,
    scheduledNotifications: scheduled,
  });
}
