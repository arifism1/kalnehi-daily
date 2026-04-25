"use client";

import {
  AlarmClock,
  BarChart3,
  BookOpen,
  Brain,
  Camera,
  CalendarDays,
  CheckCircle,
  ChevronDown,
  Clapperboard,
  ClipboardList,
  Clock,
  Flower2,
  HelpCircle,
  LayersIcon,
  LineChart,
  ListTodo,
  MessageSquare,
  Mic,
  NotebookPen,
  Target,
  TestTube2,
  TrendingUp,
  X,
} from "lucide-react";
import clsx from "clsx";
import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";

import { MissedTasks } from "@/components/home/MissedTasks";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useEnabledFeaturesStore } from "@/store/useEnabledFeaturesStore";

type AccordionSection = {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  content: ReactNode;
};

const StudySessionsPageContent = dynamic(
  () => import("@/app/(kalnehi)/study-sessions/StudySessionsPageContent"),
  { ssr: false },
);
const ProgressRouteLazy = dynamic(
  () => import("@/app/(kalnehi)/progress/ProgressRouteLazy"),
  { ssr: false },
);
const RevisionRemindersRouteLazy = dynamic(
  () => import("@/app/(kalnehi)/revision-reminders/RevisionRemindersRouteLazy"),
  { ssr: false },
);
const ConsistencyTrackerRouteLazy = dynamic(
  () => import("@/app/(kalnehi)/consistency-tracker/ConsistencyTrackerRouteLazy"),
  { ssr: false },
);
const HabitsRouteLazy = dynamic(
  () => import("@/app/(kalnehi)/habits/HabitsRouteLazy"),
  { ssr: false },
);
const MotivationRouteLazy = dynamic(
  () => import("@/app/(kalnehi)/motivation/MotivationRouteLazy"),
  { ssr: false },
);

const DoubtTrackerLazy = dynamic(
  () =>
    import("@/components/doubts/DoubtTracker").then((m) => ({ default: m.DoubtTracker })),
  { ssr: false },
);
const PrepBrainChatLazy = dynamic(
  () =>
    import("@/components/prepbrain/PrepBrainChat").then((m) => ({ default: m.PrepBrainChat })),
  { ssr: false },
);
const SyllabusTrackerLazy = dynamic(
  () =>
    import("@/components/syllabus/SyllabusTracker").then((m) => ({ default: m.SyllabusTracker })),
  { ssr: false },
);
const UnifiedDailyPlanListLazy = dynamic(
  () =>
    import("@/components/planner/UnifiedDailyPlanList").then((m) => ({
      default: m.UnifiedDailyPlanList,
    })),
  { ssr: false },
);
const SavedPlansHomeWidgetLazy = dynamic(
  () =>
    import("@/components/home/SavedPlansHomeWidget").then((m) => ({
      default: m.SavedPlansHomeWidget,
    })),
  { ssr: false },
);
const DictateMyDayLazy = dynamic(
  () => import("@/components/voice/DictateMyDay").then((m) => ({ default: m.DictateMyDay })),
  { ssr: false },
);
const TargetScoreBlueprintClientLazy = dynamic(
  () =>
    import("@/components/targetScoreBlueprint/TargetScoreBlueprintClient").then((m) => ({
      default: m.TargetScoreBlueprintClient,
    })),
  { ssr: false },
);
const MeditationPageLazy = dynamic(
  () =>
    import("@/components/meditation/MeditationPage").then((m) => ({ default: m.MeditationPage })),
  { ssr: false },
);
const MyTargetClientLazy = dynamic(
  () =>
    import("@/components/myTarget/MyTargetClient").then((m) => ({ default: m.MyTargetClient })),
  { ssr: false },
);
const TimerEngineClientLazy = dynamic(
  () =>
    import("@/components/engine/TimerEngineClient").then((m) => ({
      default: m.TimerEngineClient,
    })),
  { ssr: false },
);
const DailyReflectionClientLazy = dynamic(
  () =>
    import("@/components/reflection/DailyReflectionClient").then((m) => ({
      default: m.DailyReflectionClient,
    })),
  { ssr: false },
);
const MockTestsClientLazy = dynamic(
  () =>
    import("@/components/mock-tests/MockTestsClient").then((m) => ({
      default: m.MockTestsClient,
    })),
  { ssr: false },
);
const MistakeLogClientLazy = dynamic(
  () =>
    import("@/components/mistake-log/MistakeLogClient").then((m) => ({
      default: m.MistakeLogClient,
    })),
  { ssr: false },
);
export function HomeAccordionSections() {
  const today = useCalendarDate();
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const enabledFeatures = useEnabledFeaturesStore((s) => s.enabledFeatures);

  /**
   * All sections — order and IDs must stay in sync with DASHBOARD_FEATURES in
   * src/lib/dashboardFeatures.ts. When a new feature is added to the registry,
   * add the matching section entry here with the same `id`.
   */
  const allSections: AccordionSection[] = [
    {
      id: "daily-planner",
      title: "Today's Plan",
      icon: ListTodo,
      content: (
        <UnifiedDailyPlanListLazy
          planDate={today}
          title="Today's Plan"
          className="kal-glass-subtle rounded-2xl border-kal-border/60 p-4"
        />
      ),
    },
    {
      id: "dictate-my-day",
      title: "Dictate My Day",
      icon: Mic,
      content: <DictateMyDayLazy />,
    },
    {
      id: "timer",
      title: "Timer",
      icon: Clock,
      content: <TimerEngineClientLazy />,
    },
    {
      id: "missed-tasks",
      title: "Missed Tasks",
      icon: LineChart,
      content: <MissedTasks />,
    },
    {
      id: "daily-debrief",
      title: "Daily Debrief",
      icon: NotebookPen,
      content: <DailyReflectionClientLazy />,
    },
    {
      id: "shareable-recap",
      title: "Today's Recap",
      icon: Clapperboard,
      content: (
        <div className="kal-glass-subtle space-y-3 rounded-2xl border border-kal-border/60 p-4">
          <p className="text-sm leading-relaxed text-kal-text-secondary">
            End-of-day cinematic card: tasks done, study time, streak — export
            for Instagram Stories.
          </p>
          <a
            href="/recap"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-kal-accent px-5 text-sm font-semibold text-white transition-opacity hover:opacity-95"
          >
            Open today&apos;s recap
          </a>
          <a
            href="/recap/weekly"
            className="ml-3 text-sm font-semibold text-kal-accent underline-offset-2 hover:underline"
          >
            Weekly magazine
          </a>
          <a
            href="/recap/monthly"
            className="ml-3 text-sm font-semibold text-kal-accent underline-offset-2 hover:underline"
          >
            Monthly magazine
          </a>
        </div>
      ),
    },
    {
      id: "saved-daily-plans",
      title: "Saved Daily Plans",
      icon: CalendarDays,
      content: (
        <div className="kal-glass-subtle rounded-2xl border border-kal-border/60 p-4">
          <h3 className="mb-2 text-sm font-bold text-kal-text">Recent plans</h3>
          <SavedPlansHomeWidgetLazy />
        </div>
      ),
    },
    {
      id: "consistency-tracker",
      title: "Consistency Tracker",
      icon: BarChart3,
      content: <ConsistencyTrackerRouteLazy />,
    },
    {
      id: "mock-test-tracker",
      title: "Mock Test Tracker",
      icon: TestTube2,
      content: <MockTestsClientLazy />,
    },
    {
      id: "progress",
      title: "Progress",
      icon: TrendingUp,
      content: <ProgressRouteLazy />,
    },
    {
      id: "syllabus-tracker",
      title: "Syllabus Tracker",
      icon: BookOpen,
      content: <SyllabusTrackerLazy />,
    },
    {
      id: "target-score-blueprint",
      title: "Target Score Blueprint",
      icon: Target,
      content: <TargetScoreBlueprintClientLazy />,
    },
    {
      id: "my-target",
      title: "My Target",
      icon: Target,
      content: <MyTargetClientLazy />,
    },
    {
      id: "prepbrain-ai",
      title: "Mastermind",
      icon: Brain,
      content: <PrepBrainChatLazy />,
    },
    {
      id: "revision-reminders",
      title: "Revision Reminders",
      icon: AlarmClock,
      content: <RevisionRemindersRouteLazy />,
    },
    {
      id: "doubt-tracker",
      title: "Doubt Tracker",
      icon: HelpCircle,
      content: <DoubtTrackerLazy />,
    },
    {
      id: "mistake-log",
      title: "Mistake Log",
      icon: ClipboardList,
      content: <MistakeLogClientLazy />,
    },
    {
      id: "study-sessions",
      title: "On-camera sessions",
      icon: Camera,
      content: <StudySessionsPageContent />,
    },
    {
      id: "habit-maker",
      title: "Habit Maker",
      icon: CheckCircle,
      content: <HabitsRouteLazy />,
    },
    {
      id: "personal-motivation",
      title: "Personal Motivation",
      icon: MessageSquare,
      content: <MotivationRouteLazy />,
    },
    {
      id: "brain-yoga",
      title: "Brain Yoga / Meditation",
      icon: Flower2,
      content: <MeditationPageLazy />,
    },
  ];

  // null = all features enabled (no customisation set)
  const hasCustomisation = enabledFeatures !== null;

  const visibleSections =
    showAll || !hasCustomisation
      ? allSections
      : allSections.filter((s) => enabledFeatures.includes(s.id));

  const hiddenCount = allSections.length - visibleSections.length;

  return (
    <section
      className="relative z-[1] space-y-3 sm:space-y-4"
      aria-label="Dashboard feature sections"
    >
      <header className="flex flex-wrap items-end justify-between gap-2 px-1">
        <div>
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-kal-muted">
            Dashboard
          </p>
          <h2 className="kal-section-heading mt-1">
            {showAll ? "All Features" : "My Features"}
          </h2>
          <p className="mt-1 text-sm text-kal-muted">
            Open any section to use it directly here.
          </p>
        </div>

        {hasCustomisation && (
          <div className="shrink-0">
            {showAll ? (
              <button
                type="button"
                onClick={() => setShowAll(false)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-kal-accent/40 bg-kal-accent/10 px-3.5 py-2 text-xs font-semibold text-kal-accent transition-colors hover:bg-kal-accent/20"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                Back to My Features
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="kal-glass-subtle inline-flex items-center gap-1.5 rounded-xl border-kal-border/70 px-3.5 py-2 text-xs font-semibold text-kal-text-secondary transition-colors hover:border-kal-accent/40 hover:text-kal-accent"
              >
                <LayersIcon className="h-3.5 w-3.5" aria-hidden />
                Show All Features
                {hiddenCount > 0 && (
                  <span className="ml-0.5 rounded-full bg-kal-accent/15 px-1.5 py-0.5 text-[10px] font-bold text-kal-accent">
                    +{hiddenCount}
                  </span>
                )}
              </button>
            )}
          </div>
        )}
      </header>

      {visibleSections.map((section) => {
        const isOpen = openSectionId === section.id;
        const panelId = `${section.id}-panel`;
        const buttonId = `${section.id}-button`;
        const Icon = section.icon;
        return (
          <article
            key={section.id}
            className={clsx(
              "kal-glass-card overflow-hidden rounded-2xl transition-all duration-300",
              isOpen
                ? "border-kal-accent/40 shadow-[0_14px_40px_rgba(100,75,40,0.14),inset_0_1px_0_0_rgba(255,255,255,0.65)]"
                : "border-kal-border/70 hover:border-kal-accent/30",
            )}
          >
            <h2>
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() =>
                  setOpenSectionId((current) =>
                    current === section.id ? null : section.id,
                  )
                }
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-5 sm:py-4"
              >
                <span className="flex items-center gap-3">
                  <span className="kal-glass-subtle inline-flex h-9 w-9 items-center justify-center rounded-xl border-kal-border/70 text-kal-accent">
                    <Icon className="h-4.5 w-4.5" aria-hidden />
                  </span>
                  <span className="text-sm font-semibold tracking-tight text-kal-text sm:text-[0.98rem]">
                    {section.title}
                  </span>
                </span>
                <ChevronDown
                  className={clsx(
                    "h-4.5 w-4.5 shrink-0 text-kal-muted transition-transform duration-300",
                    isOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
            </h2>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={clsx(
                "grid transition-all duration-300 ease-out",
                isOpen
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="border-t border-kal-border/75 p-4 sm:p-5">
                  {isOpen ? section.content : null}
                </div>
              </div>
            </div>
          </article>
        );
      })}

      {/* When showing My Features and some are hidden, show a hint */}
      {hasCustomisation && !showAll && hiddenCount > 0 && (
        <div className="rounded-2xl border border-dashed border-kal-border/60 bg-transparent px-4 py-3.5 text-center">
          <p className="text-xs text-kal-muted">
            {hiddenCount} feature{hiddenCount > 1 ? "s" : ""} hidden.{" "}
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="font-semibold text-kal-accent underline underline-offset-2"
            >
              Show all
            </button>{" "}
            or customise in{" "}
            <a
              href="/settings"
              className="font-semibold text-kal-accent underline underline-offset-2"
            >
              Settings
            </a>
            .
          </p>
        </div>
      )}
    </section>
  );
}
