"use client";

import { Capacitor } from "@capacitor/core";
import { useLayoutEffect, useState } from "react";

export { ANDROID_APP_UA_MARKER } from "@/lib/androidAppUa";

/**
 * True inside the Capacitor native shell (`Capacitor.isNativePlatform()`). Kalnehi’s native rollout is Android-only for now,
 * but the flag stays generic (any future Capacitor target would flip it the same way).
 *
 * Defaults false for SSR / first paint; `useLayoutEffect` sets the real value before paint.
 */
export function usePlatform(): { isApp: boolean } {
  const [isApp, setIsApp] = useState(false);

  useLayoutEffect(() => {
    setIsApp(Capacitor.isNativePlatform());
  }, []);

  return { isApp };
}
