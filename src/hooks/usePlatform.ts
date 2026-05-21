"use client";

import { Capacitor } from "@capacitor/core";

export { ANDROID_APP_UA_MARKER } from "@/lib/androidAppUa";

/**
 * Returns whether the app is running inside the Capacitor native Android shell.
 * When true, callers should use native plugin paths (FCM, Browser, Network)
 * instead of web APIs (service worker, Web Push, etc.).
 */
export function usePlatform(): { isApp: boolean } {
  const isApp = Capacitor.isNativePlatform();
  return { isApp };
}
