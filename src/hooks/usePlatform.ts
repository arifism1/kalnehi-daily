"use client";

import { useEffect, useState } from "react";

export { ANDROID_APP_UA_MARKER } from "@/lib/androidAppUa";

/**
 * True when running inside Capacitor native shell (iOS/Android WebView).
 * Defaults false on server / first paint to avoid hydration mismatch.
 */
export function usePlatform(): { isApp: boolean } {
  const [isApp, setIsApp] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void import("@capacitor/core")
      .then(({ Capacitor }) => {
        if (!cancelled) setIsApp(Capacitor.isNativePlatform());
      })
      .catch(() => {
        /* Bundle missing or blocked — remain web */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { isApp };
}
