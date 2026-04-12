"use client";

import { useEffect, useRef } from "react";

import { isFirebaseConfigured } from "@/lib/firebase/config";
import { getMessagingIfSupported } from "@/lib/firebase/messagingClient";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Foreground FCM: show a system notification when a push arrives while the tab is active.
 * Background/closed tabs are handled by firebase-messaging in public/sw.js.
 */
export function FcmForegroundListener() {
  const user = useAuthStore((s) => s.user);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!user || !isFirebaseConfigured()) return;

    let cancelled = false;
    void (async () => {
      const messaging = await getMessagingIfSupported();
      if (!messaging || cancelled) return;
      const { onMessage } = await import("firebase/messaging");
      unsubRef.current = onMessage(messaging, (payload) => {
        if (typeof window === "undefined" || Notification.permission !== "granted") {
          return;
        }
        const title = payload.notification?.title ?? "Kalnehi Daily";
        const body = payload.notification?.body ?? "";
        try {
          new Notification(title, {
            body,
            icon: "/icon-192x192.png",
            badge: "/icon-192x192.png",
          });
        } catch {
          /* ignore */
        }
      });
    })();

    return () => {
      cancelled = true;
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [user?.id]);

  return null;
}
