"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";

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
 *  4. Billing paths are redirected to /home — payments must not load in WebView.
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
            // Android: block billing routes from loading Razorpay checkout in WebView.
            router.replace(isBillingPath(url.pathname) ? "/home" : destination);
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
