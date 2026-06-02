"use client";

import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";

import { getNativeConnectionKind, initNativeSyncPolicyListener } from "@/lib/nativeSyncPolicy";
import { useAuthStore } from "@/store/useAuthStore";

const WARMUP_CACHE = "kalnehi-cap-warmup-v1";

const CRITICAL_PATHS = [
  "/home",
  "/auth",
  "/offline.html",
  "/manifest.webmanifest",
  "/icon-192x192.png",
  "/icon-512x512.png",
];

/**
 * On Capacitor + Wi‑Fi, prefetch same-origin shell URLs into the Cache API so
 * repeat offline sessions need less from the APK seed alone.
 */
export function CapacitorOfflineWarmup() {
  const userId = useAuthStore((s) => s.user?.id);
  const initialized = useAuthStore((s) => s.initialized);
  const ranRef = useRef(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!userId || !initialized) return;
    if (ranRef.current) return;
    if (typeof caches === "undefined") return;

    initNativeSyncPolicyListener();

    void (async () => {
      const { Network } = await import("@capacitor/network");
      const status = await Network.getStatus();
      if (!status.connected || status.connectionType !== "wifi") return;

      ranRef.current = true;
      try {
        const cache = await caches.open(WARMUP_CACHE);
        await Promise.all(
          CRITICAL_PATHS.map(async (path) => {
            const url = new URL(path, window.location.origin).href;
            const hit = await cache.match(url);
            if (hit) return;
            try {
              await cache.add(url);
            } catch {
              /* ignore per-URL failure */
            }
          }),
        );
      } catch {
        /* private mode / quota */
      }
    })();
  }, [userId, initialized]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      if (getNativeConnectionKind() === "wifi" && userId) {
        ranRef.current = false;
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [userId]);

  return null;
}
