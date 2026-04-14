export const NOTIFICATION_PREFS_LEGACY_KEY = "kalnehi-notification-prefs-v1";

const KEY = NOTIFICATION_PREFS_LEGACY_KEY;

export type NotificationPrefs = {
  enabled: boolean;
  planningHour: number;
  planningMinute: number;
  alertPending: boolean;
  alertLowExecution: boolean;
  alertRevision: boolean;
};

export const NOTIFICATION_PREFS_DEFAULTS: NotificationPrefs = {
  enabled: false,
  planningHour: 8,
  planningMinute: 0,
  alertPending: true,
  alertLowExecution: true,
  alertRevision: true,
};

/** @deprecated Prefer IDB-backed prefs via user planner text sync. */
export function loadNotificationPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return { ...NOTIFICATION_PREFS_DEFAULTS };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...NOTIFICATION_PREFS_DEFAULTS };
    const o = JSON.parse(raw) as Partial<NotificationPrefs>;
    return { ...NOTIFICATION_PREFS_DEFAULTS, ...o };
  } catch {
    return { ...NOTIFICATION_PREFS_DEFAULTS };
  }
}

/** @deprecated Prefer IDB-backed prefs via user planner text sync. */
export function saveNotificationPrefs(p: NotificationPrefs): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(p));
}
