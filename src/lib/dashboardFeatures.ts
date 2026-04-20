import {
  BarChart3,
  BookOpen,
  Brain,
  Camera,
  CheckCircle,
  Clock,
  Flower2,
  HelpCircle,
  Inbox,
  LineChart,
  ListTodo,
  MessageSquare,
  Mic,
  PenTool,
  Sparkles,
  Target,
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

/**
 * Single registry of all dashboard accordion features.
 * Add new features here and they automatically appear in:
 *  - HomeAccordionSections (the accordion list)
 *  - FeatureSelector (onboarding + settings)
 */
export const DASHBOARD_FEATURES: DashboardFeature[] = [
  {
    id: "doubt-tracker",
    title: "Doubt Tracker",
    icon: HelpCircle,
    description: "Log and resolve your doubts before exam day.",
  },
  {
    id: "prepbrain-ai",
    title: "PrepBrain AI",
    icon: Brain,
    description: "Your AI-powered personal prep coach, available 24/7.",
  },
  {
    id: "syllabus-mastery-tracker",
    title: "Syllabus Mastery Tracker",
    icon: BookOpen,
    description: "Track chapter-by-chapter mastery with microtopic precision.",
  },
  {
    id: "daily-planner",
    title: "Daily Plan",
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
    id: "target-score-blueprint",
    title: "Target Score Blueprint",
    icon: Target,
    description: "Map the exact marks you need — subject by subject.",
  },
  {
    id: "pending-tasks",
    title: "Pending Tasks",
    icon: Inbox,
    description: "Never let a task slip — see everything that still needs doing.",
  },
  {
    id: "brain-yoga",
    title: "Brain Yoga / Meditation",
    icon: Flower2,
    description: "Stay calm and focused with guided meditation sessions.",
  },
  {
    id: "my-target",
    title: "My Target",
    icon: Target,
    description: "Set and keep your eye on your exam goal.",
  },
  {
    id: "plan-my-day",
    title: "Plan My Day",
    icon: Sparkles,
    description: "AI-assisted daily planning to make every hour count.",
  },
  {
    id: "study-sessions",
    title: "On-camera sessions",
    icon: Camera,
    description:
      "Log focus time with optional on-camera, on-device checks — nothing uploaded.",
  },
  {
    id: "timer",
    title: "Timer",
    icon: Clock,
    description: "Pomodoro-style timer to keep your study blocks sharp.",
  },
  {
    id: "progress",
    title: "Progress",
    icon: TrendingUp,
    description: "See your preparation trajectory at a glance.",
  },
  {
    id: "revision-engine",
    title: "Smart Revision Engine",
    icon: PenTool,
    description: "Syllabus-aware suggestions, active recall, and realistic spacing you can override.",
  },
  {
    id: "consistency-tracker",
    title: "Consistency Tracker",
    icon: BarChart3,
    description: "Streak calendar that rewards you for showing up daily.",
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
    id: "missed-tasks",
    title: "Missed Tasks",
    icon: LineChart,
    description: "Review tasks you missed and reschedule them easily.",
  },
];

export const ALL_FEATURE_IDS: string[] = DASHBOARD_FEATURES.map((f) => f.id);
