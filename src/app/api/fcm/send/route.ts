import { NextResponse } from "next/server";

import { getFirebaseMessagingAdmin } from "@/lib/fcm/admin";
import { isFcmAdminUser } from "@/lib/fcm/adminGate";
import { sendFcmToUserTokens } from "@/lib/fcm/sendNotifications";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_TITLE = 120;
const MAX_BODY = 2000;

type Body = {
  targetUserId?: string;
  title?: string;
  body?: string;
  data?: Record<string, string>;
};

/**
 * Admin-only: send a notification to all devices registered for targetUserId.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isFcmAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let json: Body;
    try {
      json = (await req.json()) as Body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const targetUserId =
      typeof json.targetUserId === "string" ? json.targetUserId.trim() : "";
    const title =
      typeof json.title === "string" ? json.title.trim().slice(0, MAX_TITLE) : "";
    const bodyText =
      typeof json.body === "string" ? json.body.trim().slice(0, MAX_BODY) : "";

    if (!targetUserId || !title || !bodyText) {
      return NextResponse.json(
        { error: "targetUserId, title, and body are required" },
        { status: 400 },
      );
    }

    const data: Record<string, string> = {};
    if (json.data && typeof json.data === "object") {
      for (const [k, v] of Object.entries(json.data)) {
        if (typeof v === "string" && k.length <= 64 && v.length <= 1024) {
          data[k] = v;
        }
      }
    }

    const messaging = getFirebaseMessagingAdmin();
    const { sent, failures } = await sendFcmToUserTokens(
      messaging,
      targetUserId,
      {
        title,
        body: bodyText,
        data,
      },
    );

    return NextResponse.json({
      ok: true,
      sent,
      failures: failures.length ? failures : undefined,
    });
  } catch (e) {
    console.error("[fcm/send]", e);
    const msg = e instanceof Error ? e.message : "Send failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
