"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";

import { APP_HOME_PATH } from "@/config/appRoutes";
import {
  isFcmEnabledLocally,
  registerFcmTokenOnServer,
} from "@/lib/fcm/registerClient";
import { resolveNotificationPath } from "@/lib/fcm/resolveNotificationPath";
import { useAuthStore } from "@/store/useAuthStore";

/** Mirrors isAndroidAppBillingBlockedPath in proxy.ts — keep in sync manually. */
const BILLING_BLOCKED_PATHS = [
  "/pricing",
  "/checkout",
  "/my-subscription",
  "/my-plan",
  "/upgrade",
  "/waitlist/position",
] as const;

function isBillingPath(pathname: string): boolean {
  return BILLING_BLOCKED_PATHS.some(
    (blocked) => pathname === blocked || pathname.startsWith(`${blocked}/`),
  );
}

function normalizeNotificationData(data: unknown): Record<string, string> {
  if (!data || typeof data !== "object") return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (value != null) out[key] = String(value);
  }
  return out;
}

/**
 * Capacitor Android FCM: token refresh sync and notification tap routing.
 * Web/PWA uses FcmForegroundListener + service worker instead.
 */
export function FcmNativeListener() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!user?.id) return;

    let tokenHandle: { remove: () => void } | null = null;
    let actionHandle: { remove: () => void } | null = null;
    let cancelled = false;

    const navigateFromNotification = (data: unknown) => {
      const normalized = normalizeNotificationData(data);
      const path = resolveNotificationPath(normalized);
      if (!path || path === "/") return;
      if (isBillingPath(path)) {
        router.replace(APP_HOME_PATH);
        return;
      }
      router.replace(path);
    };

    void (async () => {
      const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");
      if (cancelled) return;

      tokenHandle = await FirebaseMessaging.addListener(
        "tokenReceived",
        async (event) => {
          const token = event.token?.trim();
          if (!token) return;
          tokenRef.current = token;
          const enabled = await isFcmEnabledLocally();
          if (!enabled) return;
          await registerFcmTokenOnServer(token);
        },
      );

      actionHandle = await FirebaseMessaging.addListener(
        "notificationActionPerformed",
        (event) => {
          navigateFromNotification(event.notification?.data);
        },
      );
    })();

    return () => {
      cancelled = true;
      tokenHandle?.remove();
      actionHandle?.remove();
    };
  }, [router, user?.id]);

  return null;
}
