/**
 * Async key-value storage wrapper.
 *
 * On native Capacitor (Android/iOS) → @capacitor/preferences (survives force-close).
 * On web / SSR                      → window.localStorage (graceful fallback).
 *
 * All functions are async so callers are future-proof regardless of platform.
 */

async function isNative(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export async function getItem(key: string): Promise<string | null> {
  if (await isNative()) {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key });
    return value;
  }
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  if (await isNative()) {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.set({ key, value });
    return;
  }
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export async function removeItem(key: string): Promise<void> {
  if (await isNative()) {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.remove({ key });
    return;
  }
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/**
 * Zustand-compatible StateStorage adapter.
 * Pass to `createJSONStorage(() => storageAdapter)`.
 * Zustand 5 accepts async getItem/setItem/removeItem natively.
 */
export const storageAdapter = { getItem, setItem, removeItem };
