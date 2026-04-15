"use client";

import {
  BarChart3,
  BookOpen,
  Brain,
  CheckCircle,
  ChevronDown,
  Clock,
  Flower2,
  HelpCircle,
  Image,
  Inbox,
  LineChart,
  ListTodo,
  MessageSquare,
  Mic,
  NotebookPen,
  PenTool,
  PlayCircle,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import clsx from "clsx";
import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";

import { PendingTasksClient } from "@/components/engine/PendingTasksClient";
import { TimerEngineClient } from "@/components/engine/TimerEngineClient";
import { DoubtTracker } from "@/components/doubts/DoubtTracker";
import { MissedTasks } from "@/components/home/MissedTasks";
import { MeditationPage } from "@/components/meditation/MeditationPage";
import { MyTargetClient } from "@/components/myTarget/MyTargetClient";
import { PlanMyDayPage } from "@/components/planner/PlanMyDayPage";
import { PasteHandwrittenPlanPage } from "@/components/planner/PasteHandwrittenPlanPage";
import { UnifiedDailyPlanList } from "@/components/planner/UnifiedDailyPlanList";
import { PrepBrainChat } from "@/components/prepbrain/PrepBrainChat";
import { SyllabusTracker } from "@/components/syllabus/SyllabusTracker";
import { AiFeatureGate } from "@/components/subscription/AiFeatureGate";
import { TargetScoreBlueprintClient } from "@/components/targetScoreBlueprint/TargetScoreBlueprintClient";
import { DictateMyDay } from "@/components/voice/DictateMyDay";
import { useCalendarDate } from "@/hooks/useCalendarDate";

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
const DailyLogRouteLazy = dynamic(
  () => import("@/app/(kalnehi)/daily-log/DailyLogRouteLazy"),
  { ssr: false },
);
const RevisionRouteLazy = dynamic(
  () => import("@/app/(kalnehi)/revision/RevisionRouteLazy"),
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

export function HomeAccordionSections() {
  const today = useCalendarDate();
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);

  const sections: AccordionSection[] = [
    {
      id: "doubt-tracker",
      title: "Doubt Tracker",
      icon: HelpCircle,
      content: <DoubtTracker />,
    },
    {
      id: "prepbrain-ai",
      title: "PrepBrain AI",
      icon: Brain,
      content: <PrepBrainChat />,
    },
    {
      id: "syllabus-mastery-tracker",
      title: "Syllabus Mastery Tracker",
      icon: BookOpen,
      content: <SyllabusTracker />,
    },
    {
      id: "daily-planner",
      title: "Daily Planner",
      icon: ListTodo,
      content: (
        <UnifiedDailyPlanList
          planDate={today}
          title="Today’s Daily Planner"
          className="rounded-2xl border border-kal-border/70 bg-white/45 p-4 dark:bg-zinc-900/30"
        />
      ),
    },
    {
      id: "dictate-my-day",
      title: "Dictate My Day",
      icon: Mic,
      content: <DictateMyDay />,
    },
    {
      id: "handwritten-scan",
      title: "Handwritten Scan",
      icon: Image,
      content: (
        <AiFeatureGate feature="photo_scan">
          <div className="mx-auto max-w-2xl">
            <PasteHandwrittenPlanPage />
          </div>
        </AiFeatureGate>
      ),
    },
    {
      id: "target-score-blueprint",
      title: "Target Score Blueprint",
      icon: Target,
      content: <TargetScoreBlueprintClient />,
    },
    {
      id: "pending-tasks",
      title: "Pending Tasks",
      icon: Inbox,
      content: <PendingTasksClient />,
    },
    {
      id: "brain-yoga",
      title: "Brain Yoga / Meditation",
      icon: Flower2,
      content: <MeditationPage />,
    },
    {
      id: "my-target",
      title: "My Target",
      icon: Target,
      content: <MyTargetClient />,
    },
    {
      id: "plan-my-day",
      title: "Plan My Day",
      icon: Sparkles,
      content: <PlanMyDayPage />,
    },
    {
      id: "study-sessions",
      title: "Study Sessions",
      icon: PlayCircle,
      content: <StudySessionsPageContent />,
    },
    {
      id: "timer",
      title: "Timer",
      icon: Clock,
      content: <TimerEngineClient />,
    },
    {
      id: "progress",
      title: "Progress",
      icon: TrendingUp,
      content: <ProgressRouteLazy />,
    },
    {
      id: "daily-log",
      title: "Daily Log",
      icon: NotebookPen,
      content: <DailyLogRouteLazy />,
    },
    {
      id: "revision-engine",
      title: "Revision Engine",
      icon: PenTool,
      content: <RevisionRouteLazy />,
    },
    {
      id: "consistency-tracker",
      title: "Consistency Tracker",
      icon: BarChart3,
      content: <ConsistencyTrackerRouteLazy />,
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
      id: "missed-tasks",
      title: "Missed Tasks",
      icon: LineChart,
      content: <MissedTasks />,
    },
  ];

  return (
    <section
      className="relative z-[1] space-y-3 sm:space-y-4"
      aria-label="Dashboard feature sections"
    >
      <header className="px-1">
        <p className="text-[0.66rem] font-semibold uppercase tracking-[0.2em] text-kal-muted">
          Dashboard
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-kal-text sm:text-2xl">
          Explore Our Features
        </h2>
        <p className="mt-1 text-sm text-kal-muted">
          Open any section to use it directly here.
        </p>
      </header>

      {sections.map((section) => {
        const isOpen = openSectionId === section.id;
        const panelId = `${section.id}-panel`;
        const buttonId = `${section.id}-button`;
        const Icon = section.icon;
        return (
          <article
            key={section.id}
            className={clsx(
              "overflow-hidden rounded-2xl border bg-white/65 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-all duration-300 dark:bg-zinc-900/35",
              isOpen
                ? "border-kal-accent/35 shadow-[0_14px_36px_rgba(15,23,42,0.14)]"
                : "border-kal-border/80 hover:border-kal-accent/30",
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
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-kal-border/80 bg-white/70 text-kal-accent dark:bg-zinc-900/40">
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
    </section>
  );
}
