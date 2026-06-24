import { resolveSystemPushPath } from "@/lib/systemPush/routes";

/** Extra kind → path fallbacks beyond system push kinds. */
const EXTRA_PATH_BY_KIND: Record<string, string> = {
  custom_reminder: "/plan",
  scheduled_notification: "/notifications",
  test: "/settings",
  reengagement_d1: "/syllabus",
  reengagement_d2: "/syllabus",
  waitlist: "/",
};

/**
 * Resolve in-app route from an FCM `data` payload.
 * Prefers explicit `data.path`; falls back to known `data.kind` routes.
 */
export function resolveNotificationPath(
  data: Record<string, string> | undefined,
): string {
  if (!data) return "/";
  const rawPath = typeof data.path === "string" ? data.path.trim() : "";
  if (rawPath.startsWith("/")) return rawPath;
  const kind = typeof data.kind === "string" ? data.kind.trim() : "";
  if (!kind) return "/";
  if (kind in EXTRA_PATH_BY_KIND) {
    return EXTRA_PATH_BY_KIND[kind] ?? "/";
  }
  return resolveSystemPushPath(kind);
}

/** Fallback map embedded in the service worker at build time. */
export function buildNotificationPathFallbackMap(): Record<string, string> {
  return {
    ...EXTRA_PATH_BY_KIND,
    morning_kickstart: resolveSystemPushPath("morning_kickstart"),
    evening_winddown: resolveSystemPushPath("evening_winddown"),
    danger_zone: resolveSystemPushPath("danger_zone"),
  };
}

/** Normalize FCM data object values to strings (required by Firebase). */
export function stringifyFcmData(
  data: Record<string, string> | undefined,
): Record<string, string> {
  if (!data) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value != null) out[key] = String(value);
  }
  return out;
}
