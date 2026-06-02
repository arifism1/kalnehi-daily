/**
 * When to pull non-critical data from Supabase on the Capacitor Android shell.
 * Web/PWA always syncs when online; native defers heavy refreshes on cellular.
 */

import { Capacitor } from "@capacitor/core";

import { useSyncStore } from "@/store/useSyncStore";

export type NativeConnectionKind = "wifi" | "cellular" | "none" | "unknown";

let connectionKind: NativeConnectionKind = "unknown";
let networkListenerInstalled = false;

/** In-memory syllabus TTL: short on web, long on native to avoid repeat downloads. */
export const SYLLABUS_TRACKER_TTL_MS_WEB = 30_000;
export const SYLLABUS_TRACKER_TTL_MS_NATIVE = 24 * 60 * 60 * 1000;

export function isNativeKalnehiShell(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

export function getNativeConnectionKind(): NativeConnectionKind {
  return connectionKind;
}

/**
 * Install @capacitor/network listener once (client-only).
 * Safe to call from multiple components; only the first call registers.
 */
export function initNativeSyncPolicyListener(): void {
  if (typeof window === "undefined" || !isNativeKalnehiShell()) return;
  if (networkListenerInstalled) return;
  networkListenerInstalled = true;

  void (async () => {
    const { Network } = await import("@capacitor/network");
    const apply = (connected: boolean, connectionType: string) => {
      if (!connected) {
        connectionKind = "none";
        return;
      }
      if (connectionType === "wifi") {
        connectionKind = "wifi";
      } else if (connectionType === "cellular") {
        connectionKind = "cellular";
      } else {
        connectionKind = "unknown";
      }
    };
    const status = await Network.getStatus();
    apply(status.connected, status.connectionType);
    await Network.addListener("networkStatusChange", (s) => {
      apply(s.connected, s.connectionType);
    });
  })();
}

export function getSyllabusTrackerCacheTtlMs(): number {
  return isNativeKalnehiShell()
    ? SYLLABUS_TRACKER_TTL_MS_NATIVE
    : SYLLABUS_TRACKER_TTL_MS_WEB;
}

/**
 * Whether to run background Supabase reads (tasks refresh, syllabus silent reload, etc.).
 * Outbox flush is handled separately and should still run when reachable.
 */
export function shouldSyncWithServer(opts?: {
  /** When true, allow sync on cellular (e.g. user tapped Retry). */
  force?: boolean;
}): boolean {
  if (opts?.force) return true;
  if (typeof window === "undefined") return true;
  if (!useSyncStore.getState().isOnline) return false;
  if (!isNativeKalnehiShell()) return true;

  const kind = connectionKind;
  if (kind === "none") return false;
  if (kind === "cellular") return false;
  return true;
}

/** Whether Vercel Analytics / Speed Insights should load (web only). */
export function shouldLoadVercelWebVitals(): boolean {
  return !isNativeKalnehiShell();
}
