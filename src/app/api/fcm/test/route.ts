import { NextResponse } from "next/server";

import {
  adminFacingFcmCredentialHint,
  tryGetFirebaseMessaging,
} from "@/lib/fcm/admin";
import { showFcmDevToolsServer } from "@/lib/fcm/adminGate";
import {
  fcmFailuresAreOnlyInvalidRegistrations,
  sendFcmToUserTokens,
} from "@/lib/fcm/sendNotifications";
import {
  FCM_NO_TOKENS_SELF_TEST,
  FCM_STALE_TOKEN_USER_MESSAGE,
} from "@/lib/fcm/messages";
import { assertSameOrigin } from "@/lib/assertSameOrigin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SITE_NAME } from "@/lib/seo-metadata";

export const runtime = "nodejs";

/**
 * Sends a test notification to the signed-in user's registered devices only.
 * Dev/admin only (same gate as the Settings "Send test notification" button).
 */
export async function POST(req: Request) {
  const denied = assertSameOrigin(req);
  if (denied) return denied;

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!showFcmDevToolsServer(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sdk = tryGetFirebaseMessaging();
    if (!sdk.ok) {
      return NextResponse.json(
        {
          ok: false,
          code: sdk.reason,
          error: adminFacingFcmCredentialHint(sdk.reason),
        },
        { status: 503 },
      );
    }

    const { sent, failures } = await sendFcmToUserTokens(sdk.messaging, user.id, {
      title: SITE_NAME,
      body: "Test notification — push is working on this account.",
      data: { kind: "test", path: "/settings" },
    });

    const failureCodes = [...new Set(failures)];

    if (sent === 0) {
      console.warn(
        `[fcm/test] userId=${user.id} sent=0 failureCodes=${failureCodes.join(",") || "none"}`,
      );
      if (fcmFailuresAreOnlyInvalidRegistrations(failures)) {
        return NextResponse.json(
          {
            ok: false,
            sent: 0,
            code: "push_token_stale",
            error: FCM_STALE_TOKEN_USER_MESSAGE,
          },
          { status: 200 },
        );
      }
      const err =
        failures[0] === "No device tokens for user"
          ? FCM_NO_TOKENS_SELF_TEST
          : "Could not send the test notification. Check server logs or try again.";
      return NextResponse.json(
        {
          ok: false,
          sent: 0,
          code:
            failures[0] === "No device tokens for user"
              ? "no_tokens"
              : "send_failed",
          error: err,
        },
        { status: 200 },
      );
    }

    if (process.env.NODE_ENV !== "production") {
      console.info(`[fcm/test] userId=${user.id} sent=${sent}`);
    }
    return NextResponse.json({
      ok: true,
      sent,
      message: `Sent to ${sent} device(s).`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    console.error("[fcm/test] unhandled", msg);
    return NextResponse.json({ error: "Send failed" }, { status: 500 });
  }
}
