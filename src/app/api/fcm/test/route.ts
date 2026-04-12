import { NextResponse } from "next/server";

import { getFirebaseMessagingAdmin } from "@/lib/fcm/admin";
import { sendFcmToUserTokens } from "@/lib/fcm/sendNotifications";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Sends a test notification to the signed-in user's registered devices only.
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

    const messaging = getFirebaseMessagingAdmin();
    const { sent, failures } = await sendFcmToUserTokens(messaging, user.id, {
      title: "Kalnehi Daily",
      body: "Test notification — push is working on this account.",
      data: { kind: "test" },
    });

    if (sent === 0) {
      return NextResponse.json(
        {
          ok: false,
          sent: 0,
          error:
            failures[0] ??
            "No tokens saved. Enable notifications on this device first.",
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
    const msg = e instanceof Error ? e.message : "Send failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
