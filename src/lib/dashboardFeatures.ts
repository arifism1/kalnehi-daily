import {
  AlarmClock,
  BarChart3,
  BookOpen,
  Brain,
  Camera,
  CalendarDays,
  CheckCircle,
  Clapperboard,
  ClipboardList,
  Clock,
  Flower2,
  HelpCircle,
  LineChart,
  ListChecks,
  ListTodo,
  MessageSquare,
  Mic,
  NotebookPen,
  Target,
  TestTube2,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

export type DashboardFeature = {
  /** Must match the `id` used in HomeAccordionSections sections array. */
  id: string;
  title: string;
  icon: LucideIcon;
  /** One-line benefit shown in the feature selector card. */
  description: string;
};

export type FeatureCategoryDef = {
  title: string;
  dotColor: string;
  featureIds: readonly string[];
};

/**
 * Grouping for the home / all-features grid and sidebar. Order within each
 * group is the same as the linear DASHBOARD_FEATURES order.
 */
export const FEATURE_CATEGORIES: FeatureCategoryDef[] = [
  {
    title: "DAILY ESSENTIALS",
    dotColor: "#EF9F27",
    featureIds: [
      "daily-planner",
      "dictate-my-day",
      "timer",
      "missed-tasks",
      "daily-debrief",
      "shareable-recap",
      "saved-daily-plans",
    ] as const,
  },
  {
    title: "YOUR PROGRESS",
    dotColor: "#1D9E75",
    featureIds: [
      "consistency-tracker",
      "mock-test-tracker",
      "progress",
      "syllabus-tracker",
      "backlogs",
      "target-score-blueprint",
      "my-target",
    ] as const,
  },
  {
    title: "STUDY TOOLS",
    dotColor: "#7F77DD",
    featureIds: [
      "prepbrain-ai",
      "revision-tracker",
      "doubt-tracker",
      "mistake-log",
      "study-squad",
      "study-sessions",
    ] as const,
  },
  {
    title: "MIND & MOTIVATION",
    dotColor: "#D4537E",
    featureIds: ["habit-maker", "personal-motivation", "brain-yoga"] as const,
  },
];

/**
 * Single registry of all dashboard accordion features.
 * Add new features here and they automatically appear in:
 *  - HomeAccordionSections (the accordion list)
 *  - FeatureSelector (onboarding + settings)
 *  - Grids / nav derived from FEATURE_CATEGORIES
 */
export const DASHBOARD_FEATURES: DashboardFeature[] = [
  {
    id: "daily-planner",
    title: "Today's Plan",
    icon: ListTodo,
    description: "Plan and execute today's study tasks in one place.",
  },
  {
    id: "dictate-my-day",
    title: "Dictate My Day",
    icon: Mic,
    description: "Speak your plan and let AI build your schedule.",
  },
  {
    id: "timer",
    title: "Timer",
    icon: Clock,
    description: "Pomodoro-style timer to keep your study blocks sharp.",
  },
  {
    id: "missed-tasks",
    title: "Missed Tasks",
    icon: LineChart,
    description: "Review tasks you missed and reschedule them easily.",
  },
  {
    id: "daily-debrief",
    title: "Daily Debrief",
    icon: NotebookPen,
    description: "60-second end-of-day check-in: finished, skipped, tomorrow’s top task.",
  },
  {
    id: "shareable-recap",
    title: "Today's Recap",
    icon: Clapperboard,
    description: "Cinematic end-of-day card — tasks, study time, streak — built to share.",
  },
  {
    id: "saved-daily-plans",
    title: "Saved Daily Plans",
    icon: CalendarDays,
    description: "Review past days, completion, and time worked vs planned.",
  },
  {
    id: "consistency-tracker",
    title: "Consistency Tracker",
    icon: BarChart3,
    description: "Streak calendar that rewards you for showing up daily.",
  },
  {
    id: "mock-test-tracker",
    title: "Mock Test Tracker",
    icon: TestTube2,
    description: "Log mocks with per-subject scores and see trends over time.",
  },
  {
    id: "progress",
    title: "Progress",
    icon: TrendingUp,
    description: "See your preparation trajectory at a glance.",
  },
  {
    id: "syllabus-tracker",
    title: "Syllabus Tracker",
    icon: BookOpen,
    description: "Track chapter and microtopic progress with weight-aware precision.",
  },
  {
    id: "backlogs",
    title: "Backlogs",
    icon: ListChecks,
    description:
      "See planned vs unplanned items, capture backlog by voice or text, and schedule into your daily plan.",
  },
  {
    id: "target-score-blueprint",
    title: "Target Score Blueprint",
    icon: Target,
    description: "Map the exact marks you need — subject by subject.",
  },
  {
    id: "my-target",
    title: "My Target",
    icon: Target,
    description: "Set and keep your eye on your exam goal.",
  },
  {
    id: "prepbrain-ai",
    title: "Mastermind",
    icon: Brain,
    description: "Your AI-powered personal prep coach, available 24/7.",
  },
  {
    id: "revision-tracker",
    title: "Revision Tracker",
    icon: AlarmClock,
    description:
      "Your own revision list — custom topics or syllabus links, due dates, and priorities.",
  },
  {
    id: "doubt-tracker",
    title: "Doubt Tracker",
    icon: HelpCircle,
    description: "Log and resolve your doubts before exam day.",
  },
  {
    id: "mistake-log",
    title: "Mistake Log",
    icon: ClipboardList,
    description:
      "Log errors by type (knowledge, application, careless, time) and spot patterns.",
  },
  {
    id: "study-squad",
    title: "Study Squad",
    icon: Users,
    description:
      "Glance at a light simulated feed of peers using Kalnehi — scoped to your syllabus.",
  },
  {
    id: "study-sessions",
    title: "On-camera sessions",
    icon: Camera,
    description:
      "Log focus time with optional on-camera, on-device checks — nothing uploaded.",
  },
  {
    id: "habit-maker",
    title: "Habit Maker",
    icon: CheckCircle,
    description: "Build the micro-habits that top rankers swear by.",
  },
  {
    id: "personal-motivation",
    title: "Personal Motivation",
    icon: MessageSquare,
    description: "Your vault of affirmations and vision photos.",
  },
  {
    id: "brain-yoga",
    title: "Brain Yoga / Meditation",
    icon: Flower2,
    description: "Stay calm and focused with guided meditation sessions.",
  },
];

export const ALL_FEATURE_IDS: string[] = DASHBOARD_FEATURES.map((f) => f.id);

/** Opt-in only until toggled on in Settings → Customize My Features (new profiles with NULL enabled_features). */
export const SETTINGS_OPT_IN_DEFAULT_OFF_IDS = [
  "habit-maker",
  "personal-motivation",
  "brain-yoga",
] as const;

const SETTINGS_OPT_IN_DEFAULT_OFF_SET = new Set<string>(SETTINGS_OPT_IN_DEFAULT_OFF_IDS);

/** Visible palette when `enabled_features` is NULL (never customised). Preserves registry order. */
export const DEFAULT_ENABLED_FEATURE_IDS: readonly string[] = ALL_FEATURE_IDS.filter(
  (id) => !SETTINGS_OPT_IN_DEFAULT_OFF_SET.has(id),
);

/** Effective dashboard/nav ids after applying default-opt-out semantics for uncustomised profiles. */
export function resolveEffectiveEnabledFeatures(stored: string[] | null): string[] {
  if (stored === null) return [...DEFAULT_ENABLED_FEATURE_IDS];
  return stored;
}

/** Multiset equality for persisted feature id arrays (order-independent). */
export function featureIdSetsEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const counts = new Map<string, number>();
  for (const id of b) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const id of a) {
    const next = (counts.get(id) ?? 0) - 1;
    if (next < 0) return false;
    counts.set(id, next);
  }
  return true;
}

/** Keeps registry order; drops ids not in {@link ALL_FEATURE_IDS}. */
export function normalizeEnabledFeatureSelection(ids: readonly string[]): string[] {
  const want = new Set(ids);
  return ALL_FEATURE_IDS.filter((id) => want.has(id));
}

/**
 * Maps Customize UI selection → DB column.
 * NULL means “default palette” (no opt-in trio). Explicit array otherwise (including full ALL_FEATURE_IDS).
 */
export function serializeEnabledFeaturesForPersist(rawSelected: readonly string[]): string[] | null {
  const selected = normalizeEnabledFeatureSelection(rawSelected);
  if (featureIdSetsEqual(selected, DEFAULT_ENABLED_FEATURE_IDS)) return null;
  return selected;
}

/**
 * Dashboard feature IDs hidden from nav/discovery (and often the matching route).
 * Add an id here to suppress it across sidebar, grids, FeatureSelector, and main nav.
 */
export const LAUNCH_HIDDEN_DASHBOARD_FEATURE_IDS: ReadonlySet<string> = new Set([
  "study-sessions",
]);

/** `FEATURE_CATEGORIES` with any currently-hidden features removed from their groups. */
export const VISIBLE_FEATURE_CATEGORIES: FeatureCategoryDef[] = FEATURE_CATEGORIES.map(
  (cat) => ({
    ...cat,
    featureIds: (cat.featureIds as readonly string[]).filter(
      (id) => !LAUNCH_HIDDEN_DASHBOARD_FEATURE_IDS.has(id),
    ) as readonly string[],
  }),
).filter((cat) => cat.featureIds.length > 0);

/** `DASHBOARD_FEATURES` with any currently-hidden features removed. */
export const VISIBLE_DASHBOARD_FEATURES: DashboardFeature[] = DASHBOARD_FEATURES.filter(
  (f) => !LAUNCH_HIDDEN_DASHBOARD_FEATURE_IDS.has(f.id),
);

if (process.env.NODE_ENV === "development") {
  const fromCategories = FEATURE_CATEGORIES.flatMap((c) => [...c.featureIds]);
  const fromRegistry = DASHBOARD_FEATURES.map((f) => f.id);
  if (fromCategories.join() !== fromRegistry.join()) {
    console.error(
      "[dashboardFeatures] FEATURE_CATEGORIES and DASHBOARD_FEATURES id order are out of sync",
      { fromCategories, fromRegistry },
    );
  }
}
