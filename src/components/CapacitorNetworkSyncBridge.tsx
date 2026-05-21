"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

import { useAuthStore } from "@/store/useAuthStore";
import { flushOutbox } from "@/lib/sync";

/**
 * Replaces SW Background Sync for the Capacitor Android shell.
 *
 * On Android, @capacitor/network fires `networkStatusChange` whenever
 * connectivity changes. When the device comes back online and a user is signed
 * in, we flush the IndexedDB outbox (same function that the service worker's
 * `sync` event triggers on the web).
 *
 * This is a no-op on the web — the existing SW Background Sync path handles it.
 */
export function CapacitorNetworkSyncBridge() {
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let handle: { remove: () => void } | null = null;

    void (async () => {
      const { Network } = await import("@capacitor/network");

      handle = await Network.addListener("networkStatusChange", (status) => {
        if (status.connected && userId) {
          void flushOutbox(userId);
        }
      });
    })();

    return () => {
      handle?.remove();
    };
  }, [userId]);

  return null;
}
