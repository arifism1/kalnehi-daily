/**
 * Registers Background Sync (Chromium) so the service worker can wake clients
 * to flush the IndexedDB outbox when connectivity returns.
 * iOS Safari does not support SyncManager — online/offline listeners still apply.
 *
 * On Capacitor Android (native shell), SW Background Sync is unreliable.
 * Connectivity-based sync is instead handled by CapacitorNetworkSyncBridge.tsx
 * via @capacitor/network, which is a no-op here.
 */
export const OUTBOX_SYNC_TAG = "kalnehi-outbox-sync";

type RegistrationWithSync = ServiceWorkerRegistration & {
  sync?: { register: (tag: string) => Promise<void> };
};

export async function registerOutboxBackgroundSync(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    // Capacitor.isNativePlatform() is lazily imported to avoid adding a
    // hard dependency on @capacitor/core in every mutation call-site.
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) return;

    const reg = (await navigator.serviceWorker.ready) as RegistrationWithSync;
    const sync = reg.sync;
    if (sync && typeof sync.register === "function") {
      await sync.register(OUTBOX_SYNC_TAG);
    }
  } catch {
    /* unsupported, quota, or permission */
  }
}
