/** Product area / source for a notification; used for pills and the filter bar. */
export type NotificationFeatureId =
  | "daily_tasks"
  | "progress"
  | "streak"
  | "revision"
  | "subscription"
  | "general";

export type NotificationFilterId = "all" | NotificationFeatureId;

const EXACT_FEATURE_BY_TITLE: Record<string, NotificationFeatureId> = {
  "Open tasks reminder": "daily_tasks",
  "Daily progress summary": "progress",
  "Streak alert": "streak",
  "Smart Revision — reviews due": "revision",
};

/**
 * Resolves a stable feature for any row. Known titles from automated inserts map
 * exactly; new copy (e.g. subscription) matches keywords; unknown rows become `general`.
 */
export function resolveNotificationFeature(
  title: string,
  kind: string,
): NotificationFeatureId {
  const exact = EXACT_FEATURE_BY_TITLE[title];
  if (exact) return exact;

  const t = title.toLowerCase();
  if (
    /\b(subscription|billing|renewal|payment)\b/.test(t) ||
    /trial\s+\w*end|plan\s+expir/i.test(t)
  ) {
    return "subscription";
  }
  if (t.includes("revision") && (t.includes("review") || t.includes("microtopic"))) {
    return "revision";
  }
  if (kind === "streak") return "streak";
  if (kind === "deadline") return "progress";
  if (kind === "reminder") {
    if (t.includes("task") || t.includes("open ")) return "daily_tasks";
  }
  return "general";
}

const PILL_BASE =
  "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide leading-none";

export type FeatureTagPill = { label: string; className: string };

const FEATURE_PILLS: Record<NotificationFeatureId, FeatureTagPill> = {
  daily_tasks: {
    label: "Daily tasks",
    className: `${PILL_BASE} border-violet-200/90 bg-violet-50/90 text-violet-900/90 dark:border-violet-500/30 dark:bg-violet-950/50 dark:text-violet-200`,
  },
  progress: {
    label: "Progress",
    className: `${PILL_BASE} border-sky-200/90 bg-sky-50/90 text-sky-900/90 dark:border-sky-500/30 dark:bg-sky-950/50 dark:text-sky-200`,
  },
  revision: {
    label: "Revision",
    className: `${PILL_BASE} border-emerald-200/90 bg-emerald-50/90 text-emerald-900/90 dark:border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-200`,
  },
  streak: {
    label: "Streak",
    className: `${PILL_BASE} border-amber-200/90 bg-amber-50/90 text-amber-900/90 dark:border-amber-500/30 dark:bg-amber-950/50 dark:text-amber-100`,
  },
  subscription: {
    label: "Subscription",
    className: `${PILL_BASE} border-rose-200/90 bg-rose-50/90 text-rose-900/90 dark:border-rose-500/30 dark:bg-rose-950/50 dark:text-rose-200`,
  },
  general: {
    label: "General",
    className: `${PILL_BASE} border-kal-border/80 bg-kal-card-muted/80 text-kal-text-secondary`,
  },
};

export function getFeatureTagPill(feature: NotificationFeatureId): FeatureTagPill {
  return FEATURE_PILLS[feature] ?? FEATURE_PILLS.general;
}

/** Filter chips shown under the page blurb: All + one chip per product area. */
export const NOTIFICATION_FILTER_CHIPS: { id: NotificationFilterId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "daily_tasks", label: "Daily tasks" },
  { id: "progress", label: "Progress" },
  { id: "revision", label: "Revision" },
  { id: "streak", label: "Streak" },
  { id: "subscription", label: "Subscription" },
  { id: "general", label: "Other" },
];

export function countFeaturesById(
  notifications: { feature: NotificationFeatureId }[],
): Record<NotificationFeatureId, number> {
  const init: Record<NotificationFeatureId, number> = {
    daily_tasks: 0,
    progress: 0,
    streak: 0,
    revision: 0,
    subscription: 0,
    general: 0,
  };
  for (const n of notifications) {
    init[n.feature] = (init[n.feature] ?? 0) + 1;
  }
  return init;
}
