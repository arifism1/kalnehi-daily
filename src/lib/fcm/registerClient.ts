/** Client-side FCM token registration with the Kalnehi backend. */

export async function registerFcmTokenOnServer(token: string): Promise<boolean> {
  const res = await fetch("/api/fcm/register", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    }),
  });
  return res.ok;
}

export async function unregisterFcmTokenOnServer(token: string): Promise<boolean> {
  const q = new URLSearchParams({ token });
  const res = await fetch(`/api/fcm/register?${q.toString()}`, {
    method: "DELETE",
    credentials: "include",
  });
  return res.ok;
}

/** localStorage key: user opted in to push on this device. */
export const FCM_ENABLED_STORAGE_KEY = "kalnehi-fcm-enabled";

export async function isFcmEnabledLocally(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(FCM_ENABLED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
