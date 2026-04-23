"use client";

import { useEffect } from "react";

import { useAuthStore } from "@/store/useAuthStore";

function requestPersistentStorage(): void {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return;
  void navigator.storage.persist().catch(() => {});
}

/**
 * Asks the browser for durable storage (where supported) once the user is
 * signed in — reduces IndexedDB eviction for installed PWAs.
 */
export function StoragePersistenceInit() {
  const userId = useAuthStore((s) => s.user?.id);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    if (!userId || !initialized) return;
    requestPersistentStorage();
  }, [userId, initialized]);

  return null;
}
