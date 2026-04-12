"use client";

import type { Messaging } from "firebase/messaging";

import { getFirebaseAppBrowser } from "@/lib/firebase/client";
import { readFirebaseWebVapidKey } from "@/lib/firebase/config";

export async function getMessagingIfSupported(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  const { getMessaging, isSupported } = await import("firebase/messaging");
  if (!(await isSupported())) return null;
  return getMessaging(getFirebaseAppBrowser());
}

/**
 * Registers /sw.js if needed, returns FCM token, or null if unavailable / denied.
 */
export async function obtainFcmToken(): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }
  if (!("serviceWorker" in navigator)) return null;

  let vapidKey: string;
  try {
    vapidKey = readFirebaseWebVapidKey();
  } catch {
    return null;
  }

  const messaging = await getMessagingIfSupported();
  if (!messaging) return null;

  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
  });
  await registration.update?.();
  await navigator.serviceWorker.ready;

  const { getToken } = await import("firebase/messaging");
  return getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });
}

export async function revokeFcmToken(): Promise<void> {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return;
  const { deleteToken } = await import("firebase/messaging");
  await deleteToken(messaging);
}
