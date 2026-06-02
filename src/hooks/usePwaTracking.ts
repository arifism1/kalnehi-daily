"use client";

import { Capacitor } from "@capacitor/core";
import { useEffect, useRef } from "react";
import { recordPwaStatus, type PwaInstallStatus, type PwaPlatform } from "@/actions/pwaTracking";

const SESSION_KEY = "kal_pwa_tracked_v1";

function detectPlatform(): PwaPlatform | null {
  if (typeof navigator === "undefined") return null;
  return /iP(hone|ad|od)/i.test(navigator.userAgent) ? "ios" : "android";
}

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  // iOS Safari standalone flag
  if ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true) {
    return true;
  }
  // Android / Chrome
  return window.matchMedia("(display-mode: standalone)").matches;
}

function getInstallStatus(platform: PwaPlatform | null, standalone: boolean): PwaInstallStatus {
  if (!standalone) return "browser";
  return platform === "ios" ? "installed_ios" : "installed_android";
}

/**
 * Detects PWA install status on mount and reports it via server action.
 * Also listens for Android install prompt and install completion events.
 * Each detection is reported at most once per browser session.
 */
export function usePwaTracking(): { isStandalone: boolean; platform: PwaPlatform | null } {
  const platform = useRef<PwaPlatform | null>(null);
  const standalone = useRef(false);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;

    platform.current = detectPlatform();
    standalone.current = isStandaloneMode();

    // Record the current session status once per session.
    if (!sessionStorage.getItem(SESSION_KEY)) {
      const status = getInstallStatus(platform.current, standalone.current);
      sessionStorage.setItem(SESSION_KEY, status);
      recordPwaStatus({ status, platform: platform.current }).catch(() => {});
    }

    // Android: fire when Chrome prompts the user to install.
    const handlePrompt = () => {
      recordPwaStatus({
        status: "browser",
        platform: "android",
        event: "prompt_shown",
      }).catch(() => {});
    };

    // Android: fire when the user completes the install.
    const handleInstalled = () => {
      // Override the session key so we track this as installed next session.
      sessionStorage.setItem(SESSION_KEY, "installed_android");
      recordPwaStatus({
        status: "installed_android",
        platform: "android",
        event: "installed",
      }).catch(() => {});
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  return { isStandalone: standalone.current, platform: platform.current };
}
