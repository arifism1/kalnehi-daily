"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";

/**
 * Listens for Android App Links opened while the app is already running and
 * navigates the WebView to the correct route.
 *
 * Mount this once in the root layout (or the main app chrome). It is a no-op
 * on the web — the Capacitor listener is only registered on native platforms.
 *
 * How it works:
 *  1. The AndroidManifest intent-filter captures https://kalnehi.com/* links.
 *  2. Android passes the URL to Capacitor's App plugin via `appUrlOpen`.
 *  3. This hook extracts the pathname + search and calls router.push().
 */
export function CapacitorDeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let handle: { remove: () => void } | null = null;

    void (async () => {
      const { App } = await import("@capacitor/app");
      handle = await App.addListener("appUrlOpen", (event) => {
        try {
          const url = new URL(event.url);
          const destination = url.pathname + url.search + url.hash;
          if (destination && destination !== "/") {
            router.push(destination);
          }
        } catch {
          // Malformed URL — ignore
        }
      });
    })();

    return () => {
      handle?.remove();
    };
  }, [router]);

  return null;
}
