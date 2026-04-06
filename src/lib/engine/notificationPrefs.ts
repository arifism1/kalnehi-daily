const KEY = "kalnehi-notification-prefs-v1";

export type NotificationPrefs = {
  enabled: boolean;
  planningHour: number;
  planningMinute: number;
  alertPending: boolean;
  alertLowExecution: boolean;
  alertRevision: boolean;
};

const DEFAULTS: NotificationPrefs = {
  enabled: false,
  planningHour: 8,
  planningMinute: 0,
  alertPending: true,
  alertLowExecution: true,
  alertRevision: true,
};

export function loadNotificationPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const o = JSON.parse(raw) as Partial<NotificationPrefs>;
    return { ...DEFAULTS, ...o };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveNotificationPrefs(p: NotificationPrefs): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(p));
}
