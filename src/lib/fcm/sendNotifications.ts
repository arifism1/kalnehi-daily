import type { Messaging } from "firebase-admin/messaging";

import {
  resolveNotificationPath,
  stringifyFcmData,
} from "@/lib/fcm/resolveNotificationPath";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

/** FCM error codes that mean the saved token may be stale — increment streak; delete row only after threshold. */
const INVALID_REGISTRATION_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

/** Remove from DB only after this many consecutive invalid-registration responses for the same row. */
const INVALID_REGISTRATION_STREAK_DELETE_AT = 3;

/**
 * Firebase Admin attaches `code` on the error object; some transports also expose `errorInfo.code`.
 * Normalize so Set lookups work (handles stray whitespace / alternate shapes).
 */
export function extractFcmSendErrorCode(err: unknown): string {
  if (!err || typeof err !== "object") return "unknown";
  const o = err as { code?: unknown; errorInfo?: { code?: unknown } };
  const raw =
    typeof o.code === "string"
      ? o.code
      : typeof o.errorInfo?.code === "string"
        ? o.errorInfo.code
        : "unknown";
  return raw.trim();
}

function isInvalidRegistrationErrorCode(code: string): boolean {
  const c = code.trim();
  if (INVALID_REGISTRATION_CODES.has(c)) return true;
  const lower = c.toLowerCase();
  if (lower.includes("registration-token-not-registered")) return true;
  if (lower.includes("invalid-registration-token")) return true;
  return false;
}

/**
 * True when every send failure was due to invalid/expired registration (tokens are deleted in DB).
 */
export function fcmFailuresAreOnlyInvalidRegistrations(
  failures: string[],
): boolean {
  if (failures.length === 0) return false;
  return failures.every((f) => isInvalidRegistrationErrorCode(f));
}

export type FcmPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

function resolvePayloadPath(data: Record<string, string> | undefined): string {
  const rawPath = data?.path?.trim();
  if (rawPath?.startsWith("/")) return rawPath;
  return resolveNotificationPath(data);
}

function resolveAbsoluteFcmLink(path: string): string {
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.kalnehi.com";
  try {
    return new URL(path, origin).href;
  } catch {
    return `${origin}/`;
  }
}

function buildFcmMessage(token: string, payload: FcmPayload) {
  const path = resolvePayloadPath(payload.data);
  const data = stringifyFcmData({ ...payload.data, path });
  const link = resolveAbsoluteFcmLink(path);
  const analyticsLabel = data.kind ?? "kalnehi";

  return {
    token,
    notification: { title: payload.title, body: payload.body },
    data,
    webpush: {
      fcmOptions: { link: path },
    },
    fcmOptions: {
      link,
      analyticsLabel,
    },
  };
}

export async function sendFcmToUserTokens(
  messaging: Messaging,
  userId: string,
  payload: FcmPayload,
): Promise<{ sent: number; failures: string[] }> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    throw new Error("Service role client unavailable");
  }

  const { data: rows, error } = await admin
    .from("user_push_tokens")
    .select("id, token, invalid_registration_streak")
    .eq("user_id", userId);

  if (error) throw error;
  type Row = {
    id: string;
    token: string;
    invalid_registration_streak: number | null;
  };
  const typedRows = (rows ?? []) as Row[];
  const tokens = typedRows.flatMap((r) => (r.token ? [r.token] : []));
  if (tokens.length === 0) {
    return { sent: 0, failures: ["No device tokens for user"] };
  }

  const messages = tokens.map((token) => buildFcmMessage(token, payload));

  const result = await messaging.sendEach(messages);
  let sent = 0;
  const failures: string[] = [];
  const idsToDelete: string[] = [];

  for (let i = 0; i < result.responses.length; i++) {
    const resp = result.responses[i];
    const row = typedRows[i];
    const token = row?.token;
    if (!row?.id || !token) continue;

    if (resp.success) {
      sent += 1;
      // react-doctor-disable-next-line react-doctor/async-await-in-loop -- per-token sequential update after send; required to track individual token state
      await admin
        .from("user_push_tokens")
        .update({ invalid_registration_streak: 0 })
        .eq("id", row.id);
      continue;
    }

    const code = extractFcmSendErrorCode(resp.error);
    failures.push(code);

    if (!isInvalidRegistrationErrorCode(code)) continue;

    const prev = row.invalid_registration_streak ?? 0;
    const nextStreak = prev + 1;
    if (nextStreak >= INVALID_REGISTRATION_STREAK_DELETE_AT) {
      idsToDelete.push(row.id);
    } else {
      await admin
        .from("user_push_tokens")
        .update({ invalid_registration_streak: nextStreak })
        .eq("id", row.id);
    }
  }

  if (idsToDelete.length > 0) {
    await admin.from("user_push_tokens").delete().in("id", idsToDelete);
  }

  return { sent, failures };
}

/** Distinct `user_id` values that have at least one FCM token stored. */
export async function getDistinctUserIdsWithPushTokens(): Promise<string[]> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    throw new Error("Service role client unavailable");
  }

  const { data: rows, error } = await admin
    .from("user_push_tokens")
    .select("user_id");

  if (error) throw error;
  const ids = new Set<string>();
  for (const row of rows ?? []) {
    if (row.user_id && typeof row.user_id === "string") {
      ids.add(row.user_id);
    }
  }
  return [...ids];
}
