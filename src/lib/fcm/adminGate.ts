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

/** Dev tools: test button + self-send test API (same as existing push dev pattern). */
export function showFcmDevTools(user: User | null): boolean {
  if (process.env.NEXT_PUBLIC_FCM_DEV_TOOLS === "1") return true;
  const devEmail = process.env.NEXT_PUBLIC_DEV_EMAIL?.trim().toLowerCase();
  const u = user?.email?.toLowerCase();
  if (devEmail && u && u === devEmail) return true;
  return isFcmAdminUser(user);
}
