/**
 * Registers Background Sync (Chromium) so the service worker can wake clients
 * to flush the IndexedDB outbox when connectivity returns.
 * iOS Safari does not support SyncManager — online/offline listeners still apply.
 */
export const OUTBOX_SYNC_TAG = "kalnehi-outbox-sync";

type RegistrationWithSync = ServiceWorkerRegistration & {
  sync?: { register: (tag: string) => Promise<void> };
};

export async function registerOutboxBackgroundSync(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const reg = (await navigator.serviceWorker.ready) as RegistrationWithSync;
    const sync = reg.sync;
    if (sync && typeof sync.register === "function") {
      await sync.register(OUTBOX_SYNC_TAG);
    }
  } catch {
    /* unsupported, quota, or permission */
  }
}
