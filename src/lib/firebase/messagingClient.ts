"use client";

import type { Messaging } from "firebase/messaging";
import { Capacitor } from "@capacitor/core";

import { getFirebaseAppBrowser } from "@/lib/firebase/client";
import { readFirebaseWebVapidKey } from "@/lib/firebase/config";

export type ObtainFcmTokenResult = {
  token: string | null;
  /** Shown in Settings when token is null */
  hint?: string;
};

export type ObtainFcmTokenOptions = {
  /**
   * Clear cached FCM token, unsubscribe from Web Push, then request a new token.
   * Use when enabling notifications or explicitly refreshing — not on routine sync (avoids iOS churn).
   */
  forceRefresh?: boolean;
};

/** True for iPhone / iPad / iPod touch (and iPadOS desktop UA). Used for PWA push UX hints. */
export function isIosWebPushDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export async function getMessagingIfSupported(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  const { getMessaging, isSupported } = await import("firebase/messaging");
  if (!(await isSupported())) return null;
  return getMessaging(getFirebaseAppBrowser());
}

function isLocalhostDevHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  );
}

/**
 * Push / FCM requires a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts).
 * `http://192.168.x.x:3000` is NOT secure — PushManager.subscribe fails with
 * "Registration failed - push service not available" in Chrome.
 */
function secureContextHint(): string | undefined {
  if (typeof window === "undefined") return undefined;
  if (window.isSecureContext) return undefined;
  const { hostname, protocol } = window.location;
  if (protocol === "http:" && isLocalhostDevHostname(hostname)) return undefined;
  return "Push needs a secure context. Use https in production, or open the app at http://localhost (not a LAN IP like 192.168.x.x) while developing.";
}

async function waitForRegistrationActive(
  reg: ServiceWorkerRegistration,
): Promise<void> {
  await navigator.serviceWorker.ready;
  if (reg.active) return;
  const sw = reg.installing ?? reg.waiting;
  if (!sw) return;
  if (sw.state === "activated") return;
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      sw.removeEventListener("statechange", onChange);
      reject(new Error("Service worker activation timed out"));
    }, 60_000);
    const onChange = () => {
      if (sw.state === "activated") {
        window.clearTimeout(timer);
        sw.removeEventListener("statechange", onChange);
        resolve();
      } else if (sw.state === "redundant") {
        window.clearTimeout(timer);
        sw.removeEventListener("statechange", onChange);
        reject(new Error("Service worker redundant"));
      }
    };
    sw.addEventListener("statechange", onChange);
  });
}

function hintFromGetTokenError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (
    lower.includes("push service not available") ||
    lower.includes("registration failed")
  ) {
    return "The browser could not use the push service. Try: use http://localhost or https (not a LAN IP over http), disable VPN/ad blockers, use Chrome or Edge, or try again on a different network.";
  }
  if (lower.includes("aborted") || err instanceof DOMException) {
    return "Push registration was interrupted. Reload the page, ensure notifications are allowed, and try again.";
  }
  return "Could not register for push. Check Firebase Web Push (VAPID) key and try another browser or network.";
}

/**
 * Registers /sw.js if needed, returns FCM token, or null if unavailable / denied.
 * Never rejects — avoids unhandled promise rejections (Next.js dev overlay).
 *
 * Pass `{ forceRefresh: true }` after enable or when re-registering so Firebase and the push
 * subscription are renewed (important on iOS Safari where tokens expire aggressively).
 */
export async function obtainFcmToken(
  options?: ObtainFcmTokenOptions,
): Promise<ObtainFcmTokenResult> {
  const forceRefresh = options?.forceRefresh === true;
  if (typeof window === "undefined" || !("Notification" in window)) {
    return { token: null, hint: "Notifications are not supported here." };
  }
  if (!("serviceWorker" in navigator)) {
    return { token: null, hint: "Service workers are not supported in this browser." };
  }
  if (!("PushManager" in window)) {
    return {
      token: null,
      hint: "Web Push is not available (no PushManager). Try Chrome or Edge on desktop.",
    };
  }

  const secureHint = secureContextHint();
  if (secureHint) {
    return { token: null, hint: secureHint };
  }

  let vapidKey: string;
  try {
    vapidKey = readFirebaseWebVapidKey();
  } catch {
    return { token: null, hint: "Missing NEXT_PUBLIC_FIREBASE_FCM_VAPID_KEY." };
  }

  try {
    const messaging = await getMessagingIfSupported();
    if (!messaging) {
      return {
        token: null,
        hint: "Firebase Messaging is not supported in this browser.",
      };
    }

    let registration =
      (await navigator.serviceWorker.getRegistration("/")) ?? null;
    if (!registration) {
      registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
    }
    await registration.update?.();
    await waitForRegistrationActive(registration);

    const { getToken, deleteToken } = await import("firebase/messaging");

    if (forceRefresh) {
      await deleteToken(messaging).catch(() => {});
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe().catch(() => {});
      }
      if (isIosWebPushDevice()) {
        await new Promise((r) => window.setTimeout(r, 900));
      }
    }

    const getOpts = {
      vapidKey,
      serviceWorkerRegistration: registration,
    };

    let token: string | undefined;
    try {
      token = await getToken(messaging, getOpts);
    } catch (firstErr) {
      if (forceRefresh && isIosWebPushDevice()) {
        await new Promise((r) => window.setTimeout(r, 850));
        try {
          token = await getToken(messaging, getOpts);
        } catch {
          console.warn("[FCM] getToken failed (after iOS retry):", firstErr);
          return { token: null, hint: hintFromGetTokenError(firstErr) };
        }
      } else {
        console.warn("[FCM] getToken failed:", firstErr);
        return { token: null, hint: hintFromGetTokenError(firstErr) };
      }
    }

    if (!token && forceRefresh && isIosWebPushDevice()) {
      await new Promise((r) => window.setTimeout(r, 700));
      try {
        const second = await getToken(messaging, getOpts);
        if (second) {
          return { token: second };
        }
      } catch {
        /* fall through */
      }
    }

    if (!token) {
      return {
        token: null,
        hint: "No FCM token returned. Check Firebase project and Web Push key.",
      };
    }
    return { token };
  } catch (err) {
    console.warn("[FCM] getToken failed:", err);
    return { token: null, hint: hintFromGetTokenError(err) };
  }
}

export async function revokeFcmToken(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await revokeNativeFcmToken();
    return;
  }
  const messaging = await getMessagingIfSupported();
  if (!messaging) return;
  const { deleteToken } = await import("firebase/messaging");
  await deleteToken(messaging).catch(() => {});
}

// ── Native FCM (Capacitor Android) ────────────────────────────────────────────

/**
 * Requests notification permission and returns an FCM token using the native
 * Capacitor Firebase Messaging plugin. Token format is identical to the web
 * FCM token — the server-side /api/fcm/register endpoint requires no changes.
 *
 * Only call on Capacitor.isNativePlatform().
 */
export async function obtainNativeFcmToken(): Promise<ObtainFcmTokenResult> {
  try {
    const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");

    const { receive } = await FirebaseMessaging.checkPermissions();
    if (receive === "denied") {
      return {
        token: null,
        hint: "Notifications are blocked. Enable them in Android Settings → Apps → Kalnehi Daily → Notifications.",
      };
    }

    if (receive !== "granted") {
      const { receive: granted } = await FirebaseMessaging.requestPermissions();
      if (granted !== "granted") {
        return {
          token: null,
          hint: "Notification permission was not granted.",
        };
      }
    }

    const { token } = await FirebaseMessaging.getToken();
    if (!token) {
      return {
        token: null,
        hint: "Native FCM did not return a token. Ensure google-services.json is present in android/app/.",
      };
    }
    return { token };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { token: null, hint: `Native FCM error: ${msg}` };
  }
}

/**
 * Deletes the native FCM token so the device stops receiving push notifications.
 * Only call on Capacitor.isNativePlatform().
 */
export async function revokeNativeFcmToken(): Promise<void> {
  try {
    const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");
    await FirebaseMessaging.deleteToken();
  } catch {
    // Ignore — token may already be gone
  }
}
