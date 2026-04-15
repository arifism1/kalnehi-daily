import type { User } from "@supabase/supabase-js";

/**
 * Who may call admin FCM routes (send to arbitrary users).
 * Configure FCM_ADMIN_EMAILS and/or FCM_ADMIN_USER_IDS (comma-separated).
 */
export function isFcmAdminUser(user: User | null): boolean {
  if (!user) return false;
  const emails =
    process.env.FCM_ADMIN_EMAILS?.split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean) ?? [];
  const ids =
    process.env.FCM_ADMIN_USER_IDS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  const email = user.email?.toLowerCase();
  if (emails.length && email && emails.includes(email)) return true;
  if (ids.length && ids.includes(user.id)) return true;
  return false;
}

function devEmailMatchesUser(user: User | null): boolean {
  if (!user) return false;
  const devEmail = process.env.NEXT_PUBLIC_DEV_EMAIL?.trim().toLowerCase();
  const u = user.email?.toLowerCase();
  return Boolean(devEmail && u && devEmail === u);
}

/**
 * Route Handlers: FCM test API and `/api/fcm/capabilities` (reads `FCM_ADMIN_*`).
 * Client UI should call capabilities for `showDevFcmTools` — do not trust `NEXT_PUBLIC_*` alone in production.
 */
export function showFcmDevToolsServer(user: User | null): boolean {
  if (!user) return false;
  if (isFcmAdminUser(user)) return true;
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.NEXT_PUBLIC_FCM_DEV_TOOLS === "1") return true;
  return devEmailMatchesUser(user);
}

/**
 * Who may use broadcast / targeted admin push (Settings "Send Push Notification").
 * In production only {@link isFcmAdminUser} grants access — not `NEXT_PUBLIC_DEV_EMAIL`.
 */
export function canAccessFcmBroadcastTools(user: User | null): boolean {
  if (!user) return false;
  if (isFcmAdminUser(user)) return true;
  if (process.env.NODE_ENV === "production") return false;
  const devEmail = process.env.NEXT_PUBLIC_DEV_EMAIL?.trim().toLowerCase();
  const u = user.email?.toLowerCase();
  return Boolean(devEmail && u && devEmail === u);
}
