"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * Fires when the user closes the Chrome Custom Tab without finishing OAuth
 * (or after it closes post-success). Use to clear button loading state.
 */
export function useNativeOAuthBrowserDismiss(
  onDismiss: () => void,
  enabled: boolean,
): void {
  useEffect(() => {
    if (!enabled || !Capacitor.isNativePlatform()) return;

    let handle: { remove: () => void } | null = null;

    void (async () => {
      const { Browser } = await import("@capacitor/browser");
      handle = await Browser.addListener("browserFinished", onDismiss);
    })();

    return () => {
      handle?.remove();
    };
  }, [enabled, onDismiss]);
}
