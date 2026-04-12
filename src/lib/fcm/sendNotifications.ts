import type { Messaging } from "firebase-admin/messaging";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

/** FCM error codes that mean the saved token is dead — safe to remove from DB and ask user to re-enable push. */
const INVALID_REGISTRATION_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

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
    .select("token")
    .eq("user_id", userId);

  if (error) throw error;
  const tokens = (rows ?? []).map((r) => r.token).filter(Boolean);
  if (tokens.length === 0) {
    return { sent: 0, failures: ["No device tokens for user"] };
  }

  const messages = tokens.map((token) => ({
    token,
    notification: { title: payload.title, body: payload.body },
    data: payload.data ?? {},
    webpush: {
      fcmOptions: {
        link: "/",
      },
    },
  }));

  const result = await messaging.sendEach(messages);
  let sent = 0;
  const failures: string[] = [];
  const deadTokens: string[] = [];

  result.responses.forEach((resp, i) => {
    const token = tokens[i];
    if (resp.success) {
      sent += 1;
      return;
    }
    const code = extractFcmSendErrorCode(resp.error);
    failures.push(code);
    if (token && isInvalidRegistrationErrorCode(code)) {
      deadTokens.push(token);
    }
  });

  if (deadTokens.length > 0) {
    await admin.from("user_push_tokens").delete().in("token", deadTokens);
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
