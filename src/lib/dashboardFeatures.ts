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
  ListTodo,
  MessageSquare,
  Mic,
  NotebookPen,
  Sparkles,
  Target,
  TestTube2,
  TrendingUp,
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
      "plan-my-day",
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
      "target-score-blueprint",
      "my-target",
    ] as const,
  },
  {
    title: "STUDY TOOLS",
    dotColor: "#7F77DD",
    featureIds: [
      "prepbrain-ai",
      "revision-reminders",
      "doubt-tracker",
      "mistake-log",
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
    id: "plan-my-day",
    title: "Plan My Day",
    icon: Sparkles,
    description: "AI-assisted daily planning to make every hour count.",
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
    title: "PrepBrain AI",
    icon: Brain,
    description: "Your AI-powered personal prep coach, available 24/7.",
  },
  {
    id: "revision-reminders",
    title: "Revision Reminders",
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

if (process.env.NODE_ENV === "development") {
  const fromCategories = FEATURE_CATEGORIES.flatMap((c) => [...c.featureIds]);
  const fromRegistry = DASHBOARD_FEATURES.map((f) => f.id);
  if (fromCategories.join() !== fromRegistry.join()) {
    // eslint-disable-next-line no-console -- dev-only sync guard
    console.error(
      "[dashboardFeatures] FEATURE_CATEGORIES and DASHBOARD_FEATURES id order are out of sync",
      { fromCategories, fromRegistry },
    );
  }
}
