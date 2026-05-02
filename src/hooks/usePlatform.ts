"use client";

import { useLayoutEffect, useState } from "react";

export { ANDROID_APP_UA_MARKER } from "@/lib/androidAppUa";

/**
 * Always false — the app is distributed as a PWA. The Capacitor native shell has been removed.
 * The hook remains for interface compatibility; callers that branch on `isApp` will always take
 * the web path.
 */
export function usePlatform(): { isApp: boolean } {
  const [isApp] = useState(false);

  useLayoutEffect(() => {
    // no-op: native platform detection removed with Capacitor
  }, []);

  return { isApp };
}
