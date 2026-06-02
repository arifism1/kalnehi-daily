"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";

import {
  closeNativeOAuthBrowser,
  isNativeOAuthCallbackUrl,
} from "@/lib/nativeSupabaseOAuth";
import { APP_HOME_PATH } from "@/config/appRoutes";

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
 *  3. OAuth callbacks use a full document navigation so the server route can
 *     exchange the PKCE code and set session cookies in the WebView.
 *  4. Other paths use client-side router.replace().
 *  5. Billing paths are redirected to APP_HOME_PATH — payments must not load in WebView.
 */
export function CapacitorDeepLinkHandler() {
  const router = useRouter();
  const handledUrlsRef = useRef(new Set<string>());

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let handle: { remove: () => void } | null = null;

    const navigateDeepLink = (rawUrl: string) => {
      if (handledUrlsRef.current.has(rawUrl)) return;
      handledUrlsRef.current.add(rawUrl);

      try {
        const url = new URL(rawUrl);
        const destination = url.pathname + url.search + url.hash;
        if (!destination || destination === "/") return;

        if (isBillingPath(url.pathname)) {
          router.replace(APP_HOME_PATH);
          return;
        }

        if (isNativeOAuthCallbackUrl(url)) {
          void closeNativeOAuthBrowser();
          // Full navigation: server `/auth/callback` must read PKCE cookies from this WebView.
          window.location.assign(destination);
          return;
        }

        router.replace(destination);
      } catch {
        // Malformed URL — ignore
      }
    };

    void (async () => {
      const { App } = await import("@capacitor/app");

      const launch = await App.getLaunchUrl();
      if (launch?.url) {
        navigateDeepLink(launch.url);
      }

      handle = await App.addListener("appUrlOpen", (event) => {
        navigateDeepLink(event.url);
      });
    })();

    return () => {
      handle?.remove();
    };
  }, [router]);

  return null;
}
