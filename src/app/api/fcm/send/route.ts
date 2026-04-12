import { NextResponse } from "next/server";

import {
  adminFacingFcmCredentialHint,
  tryGetFirebaseMessaging,
} from "@/lib/fcm/admin";
import { canAccessFcmBroadcastTools } from "@/lib/fcm/adminGate";
import { resolveRecipientUserId } from "@/lib/fcm/resolveRecipient";
import {
  getDistinctUserIdsWithPushTokens,
  sendFcmToUserTokens,
} from "@/lib/fcm/sendNotifications";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export const runtime = "nodejs";
/** Large “send to all” batches can take a while; keep under your deployment limit. */
export const maxDuration = 120;

const MAX_TITLE = 120;
const MAX_BODY = 2000;

type Body = {
  /** Preferred: `"all"` or `"single"`. */
  scope?: "all" | "single";
  /** When `scope` is `"single"`: email or Supabase user UUID. */
  recipient?: string;
  title?: string;
  body?: string;
  data?: Record<string, string>;
  /** @deprecated Use `scope: "single"` and `recipient` instead. */
  targetUserId?: string;
};

/**
 * Admin / dev: send FCM to one user (by id or email) or broadcast to every user with stored tokens.
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
    if (!canAccessFcmBroadcastTools(user)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let json: Body;
    try {
      json = (await req.json()) as Body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const title =
      typeof json.title === "string" ? json.title.trim().slice(0, MAX_TITLE) : "";
    const bodyText =
      typeof json.body === "string" ? json.body.trim().slice(0, MAX_BODY) : "";

    if (!title || !bodyText) {
      return NextResponse.json(
        { error: "title and body are required" },
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

    let scope: "all" | "single" = "single";
    let recipientRaw = "";

    if (json.scope === "all" || json.scope === "single") {
      scope = json.scope;
      recipientRaw =
        typeof json.recipient === "string" ? json.recipient.trim() : "";
    } else if (typeof json.targetUserId === "string" && json.targetUserId.trim()) {
      scope = "single";
      recipientRaw = json.targetUserId.trim();
    } else {
      recipientRaw =
        typeof json.recipient === "string" ? json.recipient.trim() : "";
    }

    if (scope === "single" && !recipientRaw) {
      return NextResponse.json(
        { error: "recipient is required (email or user id) for single-user send" },
        { status: 400 },
      );
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

    const admin = getSupabaseServiceRoleClient();
    if (!admin) {
      return NextResponse.json(
        { error: "Server cannot access user directory." },
        { status: 503 },
      );
    }

    const payload = { title, body: bodyText, data };

    if (scope === "single") {
      const resolved = await resolveRecipientUserId(admin, recipientRaw);
      if ("error" in resolved) {
        return NextResponse.json({ error: resolved.error }, { status: 400 });
      }

      const { sent, failures } = await sendFcmToUserTokens(
        sdk.messaging,
        resolved.userId,
        payload,
      );

      const usersNotified = sent > 0 ? 1 : 0;

      return NextResponse.json({
        ok: true,
        scope: "single",
        sent,
        usersNotified,
        failures: failures.length ? failures : undefined,
      });
    }

    const userIds = await getDistinctUserIdsWithPushTokens();
    let sent = 0;
    let usersNotified = 0;
    const failures: string[] = [];

    for (const uid of userIds) {
      const result = await sendFcmToUserTokens(sdk.messaging, uid, payload);
      sent += result.sent;
      if (result.sent > 0) {
        usersNotified += 1;
      }
      failures.push(...result.failures);
    }

    return NextResponse.json({
      ok: true,
      scope: "all",
      sent,
      usersNotified,
      recipientUsers: userIds.length,
      failures: failures.length ? failures.slice(0, 50) : undefined,
      failuresTruncated:
        failures.length > 50 ? failures.length - 50 : undefined,
    });
  } catch (e) {
    console.error("[fcm/send]", e);
    return NextResponse.json({ error: "Send failed" }, { status: 500 });
  }
}
