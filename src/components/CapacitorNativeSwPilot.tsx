"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * Optional pilot: register /sw.js inside the Capacitor WebView when
 * NEXT_PUBLIC_NATIVE_SW_PILOT=true. Default off — APK seed interceptor is primary.
 */
export function CapacitorNativeSwPilot() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_NATIVE_SW_PILOT !== "true") return;
    if (!Capacitor.isNativePlatform()) return;
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* WebView may block SW — interceptor remains source of truth */
    });
  }, []);

  return null;
}
