"use client";

import clsx from "clsx";
import {
  AlarmClock,
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
  Bookmark,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { useCalendarDate } from "@/hooks/useCalendarDate";
import {
  filterTasksForDate,
  findMissedIncompleteTasks,
} from "@/lib/progressEngine";
import { useEnabledFeaturesStore } from "@/store/useEnabledFeaturesStore";
import { useTaskStore } from "@/store/useTaskStore";

type FeatureItem = {
  id: string;
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  staticHint?: string;
  /** Returns live status hint when data is available */
  liveHint?: (data: LiveData) => string | null;
  fallback: string;
};

type Category = {
  title: string;
  dotColor: string;
  items: FeatureItem[];
};

type LiveData = {
  todayTaskCount: number;
  pendingCount: number;
  missedCount: number;
  syllabusMasteryPercent: number | null;
  marksMastered: number;
  marksTotal: number;
  streakDays: number | null;
  todayPercent: number;
  todayTaskCount_: number;
};

const CATEGORIES: Category[] = [
  {
    title: "Plan & Execute",
    dotColor: "#EF9F27",
    items: [
      {
        id: "daily-planner",
        href: "/daily-plan",
        label: "Daily Plan",
        icon: ListTodo,
        liveHint: (d) => (d.todayTaskCount > 0 ? `${d.todayTaskCount} tasks today` : null),
        fallback: "No plan yet",
      },
      {
        id: "dictate-my-day",
        href: "/dictate-day",
        label: "Dictate My Day",
        icon: Mic,
        staticHint: "Voice plan your day",
        fallback: "Voice plan your day",
      },
      {
        id: "plan-my-day",
        href: "/plan-my-day",
        label: "Plan My Day",
        icon: Sparkles,
        staticHint: "AI-powered planning",
        fallback: "AI-powered planning",
      },
      {
        id: "timer",
        href: "/timer",
        label: "Timer",
        icon: Clock,
        staticHint: "Start a focus session",
        fallback: "Start a focus session",
      },
      {
        id: "pending-tasks",
        href: "/pending",
        label: "Pending Tasks",
        icon: Inbox,
        liveHint: (d) => (d.pendingCount > 0 ? `${d.pendingCount} pending` : null),
        fallback: "All clear",
      },
      {
        id: "missed-tasks",
        href: "/missed-tasks",
        label: "Missed Tasks",
        icon: LineChart,
        liveHint: (d) => (d.missedCount > 0 ? `${d.missedCount} missed` : null),
        fallback: "Nothing missed",
      },
    ],
  },
  {
    title: "Track & Measure",
    dotColor: "#1D9E75",
    items: [
      {
        id: "progress",
        href: "/progress",
        label: "Progress",
        icon: TrendingUp,
        liveHint: (d) =>
          d.syllabusMasteryPercent != null
            ? `${d.syllabusMasteryPercent % 1 === 0 ? d.syllabusMasteryPercent.toFixed(0) : d.syllabusMasteryPercent.toFixed(1)}% syllabus done`
            : null,
        fallback: "Track progress",
      },
      {
        id: "consistency-tracker",
        href: "/consistency-tracker",
        label: "Consistency Tracker",
        icon: BarChart3,
        liveHint: (d) =>
          d.streakDays != null && d.streakDays > 0
            ? `${d.streakDays}-day streak`
            : null,
        fallback: "Start your streak",
      },
      {
        id: "syllabus-mastery-tracker",
        href: "/syllabus",
        label: "Syllabus Mastery",
        icon: BookOpen,
        liveHint: (d) =>
          d.syllabusMasteryPercent != null
            ? `${d.syllabusMasteryPercent % 1 === 0 ? d.syllabusMasteryPercent.toFixed(0) : d.syllabusMasteryPercent.toFixed(1)}% mastered`
            : null,
        fallback: "Track mastery",
      },
      {
        id: "target-score-blueprint",
        href: "/target-score-blueprint",
        label: "Target Score Blueprint",
        icon: Target,
        liveHint: (d) =>
          d.marksMastered > 0 && d.marksTotal > 0
            ? `Proj. ${Math.round(d.marksMastered)}/${Math.round(d.marksTotal)}`
            : null,
        fallback: "Set your target",
      },
      {
        id: "my-target",
        href: "/my-target",
        label: "My Target",
        icon: Bookmark,
        staticHint: "View your goal",
        fallback: "Set a goal",
      },
    ],
  },
  {
    title: "Learn & Revise",
    dotColor: "#7F77DD",
    items: [
      {
        id: "revision-engine",
        href: "/revision-engine",
        label: "Revision Engine",
        icon: PenTool,
        staticHint: "Review due topics",
        fallback: "All caught up",
      },
      {
        id: "revision-reminders",
        href: "/revision-reminders",
        label: "Revision Reminders",
        icon: AlarmClock,
        staticHint: "Your own due list",
        fallback: "Add reminders",
      },
      {
        id: "doubt-tracker",
        href: "/doubts",
        label: "Doubt Tracker",
        icon: HelpCircle,
        staticHint: "Track your doubts",
        fallback: "No doubts logged",
      },
      {
        id: "prepbrain-ai",
        href: "/prepbrain",
        label: "PrepBrain AI",
        icon: Brain,
        staticHint: "Ask anything",
        fallback: "Ask anything",
      },
      {
        id: "study-sessions",
        href: "/study-sessions",
        label: "On-camera Sessions",
        icon: Camera,
        staticHint: "Record a session",
        fallback: "Start practicing",
      },
    ],
  },
  {
    title: "Mindset & Discipline",
    dotColor: "#D4537E",
    items: [
      {
        id: "habit-maker",
        href: "/habits",
        label: "Habit Maker",
        icon: CheckCircle,
        staticHint: "Build your habits",
        fallback: "Build your habits",
      },
      {
        id: "personal-motivation",
        href: "/motivation",
        label: "Personal Motivation",
        icon: MessageSquare,
        staticHint: "View your why",
        fallback: "View your why",
      },
      {
        id: "brain-yoga",
        href: "/meditation",
        label: "Brain Yoga / Meditation",
        icon: Flower2,
        staticHint: "Clear your mind",
        fallback: "Clear your mind",
      },
    ],
  },
];

/** Same rule as HomeAccordionSections: null = show all; else only listed ids. */
function filterCategoriesByEnabledFeatures(
  categories: Category[],
  enabledFeatures: string[] | null,
): Category[] {
  if (enabledFeatures === null) return categories;
  return categories
    .map((cat) => ({
      ...cat,
      items: cat.items.filter((item) => enabledFeatures.includes(item.id)),
    }))
    .filter((cat) => cat.items.length > 0);
}

type HomeFeatureGridProps = {
  syllabusMasteryPercent?: number | null;
  marksMastered?: number;
  marksTotal?: number;
  todayPercent?: number;
  todayTaskCount?: number;
};

function FeatureCard({
  item,
  liveData,
}: {
  item: FeatureItem;
  liveData: LiveData;
}) {
  const hint =
    item.staticHint ??
    (item.liveHint ? (item.liveHint(liveData) ?? item.fallback) : item.fallback);

  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-label={`${item.label} — ${hint}`}
      className={clsx(
        "flex min-h-[80px] flex-col rounded-[10px] border border-kal-border/70 bg-white p-3",
        "outline-none transition-colors",
        "hover:bg-[#FAFAFA] dark:bg-zinc-900/80 dark:hover:bg-zinc-900/60",
        "focus-visible:ring-2 focus-visible:ring-[#BA7517] focus-visible:ring-offset-2",
      )}
    >
      <Icon className="h-5 w-5 shrink-0 text-kal-accent" aria-hidden />
      <p className="mt-2 font-serif text-[15px] font-normal leading-[1.3] text-kal-text">
        {item.label}
      </p>
      <p className="mt-0.5 text-[11px] font-normal leading-tight text-kal-muted line-clamp-2">
        {hint}
      </p>
    </Link>
  );
}

export function HomeFeatureGrid({
  syllabusMasteryPercent = null,
  marksMastered = 0,
  marksTotal = 0,
  todayPercent = 0,
  todayTaskCount = 0,
}: HomeFeatureGridProps) {
  const today = useCalendarDate();
  const tasksRecord = useTaskStore((s) => s.tasks);
  const enabledFeatures = useEnabledFeaturesStore((s) => s.enabledFeatures);

  const visibleCategories = useMemo(
    () => filterCategoriesByEnabledFeatures(CATEGORIES, enabledFeatures),
    [enabledFeatures],
  );

  const liveData = useMemo((): LiveData => {
    const all = Object.values(tasksRecord);
    const todayTasks = filterTasksForDate(all, today);
    const missedTasks = findMissedIncompleteTasks(all, today);
    const pendingTasks = all.filter(
      (t) => t.status !== "completed" && t.assigned_date && t.assigned_date < today,
    );

    return {
      todayTaskCount: todayTaskCount > 0 ? todayTaskCount : todayTasks.length,
      pendingCount: pendingTasks.length,
      missedCount: missedTasks.length,
      syllabusMasteryPercent,
      marksMastered,
      marksTotal,
      streakDays: null,
      todayPercent,
      todayTaskCount_: todayTaskCount,
    };
  }, [tasksRecord, today, syllabusMasteryPercent, marksMastered, marksTotal, todayPercent, todayTaskCount]);

  if (visibleCategories.length === 0) {
    return (
      <p className="rounded-[10px] border border-dashed border-kal-border/70 px-4 py-6 text-center text-sm text-kal-muted">
        No features are selected for your dashboard. Choose features in{" "}
        <Link
          href="/settings"
          className="font-semibold text-kal-accent underline underline-offset-2"
        >
          Settings
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {visibleCategories.map((cat) => (
        <div key={cat.title}>
          <div className="mb-2 flex items-center gap-2">
            <span
              className="h-1 w-1 shrink-0 rounded-full"
              style={{ backgroundColor: cat.dotColor }}
              aria-hidden
            />
            <h2 className="kal-category-label">
              {cat.title}
            </h2>
          </div>

          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            }}
          >
            {cat.items.map((item) => (
              <FeatureCard key={item.id} item={item} liveData={liveData} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
