import * as admin from "firebase-admin";
import type { Messaging } from "firebase-admin/messaging";

export type FcmCredentialFailureReason =
  | "missing_env"
  | "invalid_credentials"
  | "sdk_error";

export type FirebaseMessagingResult =
  | { ok: true; messaging: Messaging }
  | { ok: false; reason: FcmCredentialFailureReason };

/**
 * User-facing hint when credentials are missing or invalid (no secrets).
 * Use only in admin/dev contexts or server logs — never echo raw env values.
 */
export function adminFacingFcmCredentialHint(
  reason: FcmCredentialFailureReason,
): string {
  switch (reason) {
    case "missing_env":
      return "Push delivery is not configured on the server. Set FIREBASE_SERVICE_ACCOUNT_JSON (Firebase service account JSON) or GOOGLE_APPLICATION_CREDENTIALS (path to a credentials file).";
    case "invalid_credentials":
      return "Firebase service account could not be loaded. Ensure FIREBASE_SERVICE_ACCOUNT_JSON is valid JSON containing private_key and client_email.";
    case "sdk_error":
      return "Firebase Admin could not start. Check server logs.";
    default:
      return "Push delivery is unavailable.";
  }
}

function tryDecodeServiceAccountRaw(raw: string): string {
  const t = raw.trim();
  if (t.startsWith("{")) return t;
  try {
    const decoded = Buffer.from(t, "base64").toString("utf8").trim();
    if (decoded.startsWith("{")) return decoded;
  } catch {
    // not base64; fall through
  }
  return t;
}

function parseServiceAccountJson(raw: string): admin.ServiceAccount {
  const decoded = tryDecodeServiceAccountRaw(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    throw new Error("parse");
  }
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      throw new Error("parse");
    }
  }
  if (!parsed || typeof parsed !== "object") throw new Error("shape");
  const o = parsed as Record<string, unknown>;
  if (
    typeof o.private_key !== "string" ||
    typeof o.client_email !== "string" ||
    o.private_key.length < 32 ||
    !o.client_email.includes("@")
  ) {
    throw new Error("fields");
  }
  return parsed as admin.ServiceAccount;
}

let messagingSingleton: Messaging | null = null;
let cachedFailure: FcmCredentialFailureReason | null = null;

/**
 * Initialize Firebase Admin once and return Messaging, or a stable failure reason.
 * Safe for missing env, invalid JSON, and optional base64-wrapped JSON in env.
 */
export function tryGetFirebaseMessaging(): FirebaseMessagingResult {
  if (messagingSingleton) {
    return { ok: true, messaging: messagingSingleton };
  }
  if (cachedFailure) {
    return { ok: false, reason: cachedFailure };
  }

  try {
    if (!admin.apps.length) {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
      const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

      if (raw) {
        try {
          const cred = parseServiceAccountJson(raw);
          admin.initializeApp({
            credential: admin.credential.cert(cred),
          });
        } catch {
          cachedFailure = "invalid_credentials";
          return { ok: false, reason: "invalid_credentials" };
        }
      } else if (gac) {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
      } else {
        cachedFailure = "missing_env";
        return { ok: false, reason: "missing_env" };
      }
    }
    messagingSingleton = admin.messaging();
    return { ok: true, messaging: messagingSingleton };
  } catch (e) {
    console.error(
      "[fcm/admin] Firebase Admin init failed:",
      e instanceof Error ? e.message : e,
    );
    cachedFailure = "sdk_error";
    return { ok: false, reason: "sdk_error" };
  }
}
