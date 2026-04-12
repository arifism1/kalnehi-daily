import type { Messaging } from "firebase-admin/messaging";

import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

const INVALID_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

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
    const code = resp.error?.code ?? "unknown";
    failures.push(code);
    if (token && INVALID_CODES.has(code)) {
      deadTokens.push(token);
    }
  });

  if (deadTokens.length > 0) {
    await admin.from("user_push_tokens").delete().in("token", deadTokens);
  }

  return { sent, failures };
}
