import { NextResponse } from "next/server";

import {
  adminFacingFcmCredentialHint,
  tryGetFirebaseMessaging,
} from "@/lib/fcm/admin";
import { showFcmDevTools } from "@/lib/fcm/adminGate";
import {
  fcmFailuresAreOnlyInvalidRegistrations,
  sendFcmToUserTokens,
} from "@/lib/fcm/sendNotifications";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const PUSH_TOKEN_STALE_MESSAGE =
  "Push notifications need to be re-enabled. Please turn the toggle OFF and then ON again.";

/**
 * Sends a test notification to the signed-in user's registered devices only.
 * Dev/admin only (same gate as the Settings "Send test notification" button).
 */
export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!showFcmDevTools(user)) {
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
      title: "Kalnehi Daily",
      body: "Test notification — push is working on this account.",
      data: { kind: "test" },
    });

    if (sent === 0) {
      if (fcmFailuresAreOnlyInvalidRegistrations(failures)) {
        return NextResponse.json(
          {
            ok: false,
            sent: 0,
            code: "push_token_stale",
            error: PUSH_TOKEN_STALE_MESSAGE,
          },
          { status: 200 },
        );
      }
      const err =
        failures[0] === "No device tokens for user"
          ? "No registered devices. Turn push on for this device first."
          : "Could not send the test notification. Try again.";
      return NextResponse.json(
        {
          ok: false,
          sent: 0,
          error: err,
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      ok: true,
      sent,
      message: `Sent to ${sent} device(s).`,
    });
  } catch (e) {
    console.error("[fcm/test]", e);
    return NextResponse.json({ error: "Send failed" }, { status: 500 });
  }
}
