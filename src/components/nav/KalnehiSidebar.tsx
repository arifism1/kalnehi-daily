"use client";

import clsx from "clsx";
import {
  AlarmClock,
  BarChart3,
  BookOpen,
  Brain,
  Camera,
  CheckCircle,
  Clapperboard,
  Clock,
  ClipboardList,
  Crown,
  Flower2,
  HelpCircle,
  Home,
  LineChart,
  ListChecks,
  MessageSquare,
  Mic,
  NotebookPen,
  Settings,
  Target,
  TrendingUp,
  Users,
  ListTodo,
  Bookmark,
  CalendarDays,
  TestTube2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { PwaUpdateCallout } from "@/components/pwa/PwaUpdateCallout";
import { resolveEffectiveEnabledFeatures, VISIBLE_FEATURE_CATEGORIES } from "@/lib/dashboardFeatures";
import { useEnabledFeaturesStore } from "@/store/useEnabledFeaturesStore";

type SidebarItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type SidebarCategory = {
  title: string;
  dotColor: string;
  items: SidebarItem[];
};

type AccountItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const ACCOUNT_ITEMS: AccountItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/my-subscription", label: "My Subscription", icon: Crown },
];

const SIDEBAR_LINK_BY_ID: Record<string, SidebarItem> = {
  "daily-planner": { href: "/daily-plan", label: "Today's Plan", icon: ListTodo },
  "dictate-my-day": { href: "/daily-plan?open=dictate", label: "Dictate My Day", icon: Mic },
  timer: { href: "/timer", label: "Timer", icon: Clock },
  "missed-tasks": { href: "/missed-tasks", label: "Missed Tasks", icon: LineChart },
  "daily-debrief": { href: "/daily-debrief", label: "Daily Debrief", icon: NotebookPen },
  "shareable-recap": { href: "/recap", label: "Today's Recap", icon: Clapperboard },
  "saved-daily-plans": { href: "/saved-plans", label: "Saved Daily Plans", icon: CalendarDays },
  "consistency-tracker": { href: "/consistency-tracker", label: "Consistency Tracker", icon: BarChart3 },
  "mock-test-tracker": { href: "/mock-tests", label: "Mock Test Tracker", icon: TestTube2 },
  progress: { href: "/progress", label: "Progress", icon: TrendingUp },
  "syllabus-tracker": { href: "/syllabus", label: "Syllabus Tracker", icon: BookOpen },
  "backlogs": { href: "/backlogs", label: "Backlogs", icon: ListChecks },
  "target-score-blueprint": {
    href: "/target-score-blueprint",
    label: "Target Score Blueprint",
    icon: Target,
  },
  "my-target": { href: "/my-target", label: "My Target", icon: Bookmark },
  "prepbrain-ai": { href: "/mastermind", label: "Mastermind", icon: Brain },
  "revision-tracker": { href: "/revision-tracker", label: "Revision Tracker", icon: AlarmClock },
  "doubt-tracker": { href: "/doubts", label: "Doubt Tracker", icon: HelpCircle },
  "mistake-log": { href: "/mistake-log", label: "Mistake Log", icon: ClipboardList },
  "study-squad": { href: "/study-squad", label: "Study Squad", icon: Users },
  "study-sessions": { href: "/study-sessions", label: "On-camera sessions", icon: Camera },
  "habit-maker": { href: "/habits", label: "Habit Maker", icon: CheckCircle },
  "personal-motivation": { href: "/motivation", label: "Personal Motivation", icon: MessageSquare },
  "brain-yoga": { href: "/meditation", label: "Brain Yoga / Meditation", icon: Flower2 },
};

export function KalnehiSidebar() {
  const pathname = usePathname();
  const storedFeatures = useEnabledFeaturesStore((s) => s.enabledFeatures);

  const sidebarCategories = useMemo(() => {
    const effective = resolveEffectiveEnabledFeatures(storedFeatures);
    return VISIBLE_FEATURE_CATEGORIES.map((cat) => ({
      title: cat.title,
      dotColor: cat.dotColor,
      items: cat.featureIds.flatMap((id) => {
        if (!effective.includes(id)) return [];
        const item = SIDEBAR_LINK_BY_ID[id];
        if (!item) {
          if (process.env.NODE_ENV !== "production") {
            console.error(`KalnehiSidebar: missing SIDEBAR_LINK_BY_ID["${id}"] — skipping entry`);
          }
          return [];
        }
        return [item];
      }),
    })).filter((cat) => cat.items.length > 0);
  }, [storedFeatures]);

  const accountItems = ACCOUNT_ITEMS;
  return (
    <nav
      role="navigation"
      aria-label="Feature navigation"
      data-tour="sidebar"
      className="hidden w-[220px] shrink-0 overflow-y-auto border-r border-kal-border/60 bg-[#FAF8F4] pt-4 pb-10 dark:bg-zinc-950/80 lg:flex lg:flex-col"
      style={{ borderColor: "var(--kal-border)" }}
    >
      {/* Same PWA update prompt as nav drawer + bottom toast (desktop large layout). */}
      <PwaUpdateCallout variant="sidebar" />
      {/* Home — always first, standalone */}
      <ul className="mb-2 mt-1">
        <li>
          <Link
            href="/home"
            aria-current={
              pathname === "/home" || pathname.startsWith("/home/") ? "page" : undefined
            }
            className={clsx(
              "flex h-9 items-center gap-2.5 px-4 text-[13px] transition-colors outline-none",
              "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-kal-accent/50",
              pathname === "/home" || pathname.startsWith("/home/")
                ? "bg-[#FFF3E4] font-medium text-[#BA7517] dark:bg-kal-accent/10 dark:text-kal-accent"
                : "font-normal text-kal-text-secondary hover:bg-black/[0.04] hover:text-kal-text dark:hover:bg-white/5",
            )}
          >
            <Home
              className={clsx(
                "h-4 w-4 shrink-0",
                pathname === "/home" || pathname.startsWith("/home/")
                  ? "text-[#BA7517] dark:text-kal-accent"
                  : "text-kal-text-secondary",
              )}
              aria-hidden
            />
            <span className="min-w-0 truncate">Home</span>
          </Link>
        </li>
      </ul>

      {sidebarCategories.map((cat) => (
        <div key={cat.title} className="mb-4">
          <div className="flex items-center gap-2 px-4 pb-1 pt-4">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: cat.dotColor }}
              aria-hidden
            />
            <p className="kal-category-label">
              {cat.title}
            </p>
          </div>

          <ul>
            {cat.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(`${item.href}/`));
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={clsx(
                      "flex h-9 items-center gap-2.5 px-4 text-[13px] transition-colors outline-none",
                      "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-kal-accent/50",
                      isActive
                        ? "bg-[#FFF3E4] font-medium text-[#BA7517] dark:bg-kal-accent/10 dark:text-kal-accent"
                        : "font-normal text-kal-text-secondary hover:bg-black/[0.04] hover:text-kal-text dark:hover:bg-white/5",
                    )}
                  >
                    <Icon
                      className={clsx(
                        "h-4 w-4 shrink-0",
                        isActive
                          ? "text-[#BA7517] dark:text-kal-accent"
                          : "text-kal-text-secondary",
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {/* Account section — always at the bottom */}
      <div className="mt-auto border-t border-kal-border/40 pt-2 pb-4">
        <p className="px-4 pb-1 pt-3 text-[10px] font-medium uppercase tracking-[0.07em] text-kal-text-secondary">
          Account
        </p>
        <ul>
          {accountItems.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={clsx(
                    "flex h-9 items-center gap-2.5 px-4 text-[13px] transition-colors outline-none",
                    "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-kal-accent/50",
                    isActive
                      ? "bg-[#FFF3E4] font-medium text-[#BA7517] dark:bg-kal-accent/10 dark:text-kal-accent"
                      : "font-normal text-kal-text-secondary hover:bg-black/[0.04] hover:text-kal-text dark:hover:bg-white/5",
                  )}
                >
                  <Icon
                    className={clsx(
                      "h-4 w-4 shrink-0",
                      isActive
                        ? "text-[#BA7517] dark:text-kal-accent"
                        : "text-kal-text-secondary",
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
