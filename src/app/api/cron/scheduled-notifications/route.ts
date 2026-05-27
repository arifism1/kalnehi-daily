import { type NextRequest, NextResponse } from "next/server";

import { runScheduledNotificationsCron } from "@/lib/cron/runScheduledNotifications";
import {
  adminFacingFcmCredentialHint,
  tryGetFirebaseMessaging,
} from "@/lib/fcm/admin";
import { createRouteLogger } from "@/lib/logger";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { verifyCronSecret } from "@/lib/verifyCronSecret";

export const runtime = "nodejs";
export const maxDuration = 300;

const log = createRouteLogger("cron/scheduled-notifications");

/** @deprecated Prefer /api/cron/notification-worker (single 5-min cron). Kept for manual/debug invokes. */
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

  try {
    const stats = await runScheduledNotificationsCron(admin, sdk.messaging);
    return NextResponse.json({ ok: true, ...stats });
  } catch {
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
