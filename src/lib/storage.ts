/**
 * Async key-value storage wrapper — web / PWA only.
 *
 * Delegates directly to `window.localStorage`. All functions are async so
 * callers remain future-proof without code changes.
 */

export async function getItem(key: string): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function setItem(key: string, value: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export async function removeItem(key: string): Promise<void> {
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
