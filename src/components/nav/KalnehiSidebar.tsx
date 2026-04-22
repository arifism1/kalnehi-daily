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
  Crown,
  Flower2,
  HelpCircle,
  Home,
  LineChart,
  MessageSquare,
  Mic,
  PenTool,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  User,
  ListTodo,
  Bookmark,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/my-subscription", label: "My Subscription", icon: Crown },
];

const SIDEBAR_CATEGORIES: SidebarCategory[] = [
  {
    title: "Plan & Execute",
    dotColor: "#EF9F27",
    items: [
      { href: "/daily-plan", label: "Daily Plan", icon: ListTodo },
      { href: "/dictate-day", label: "Dictate My Day", icon: Mic },
      { href: "/plan-my-day", label: "Plan My Day", icon: Sparkles },
      { href: "/timer", label: "Timer", icon: Clock },
      { href: "/missed-tasks", label: "Missed Tasks", icon: LineChart },
    ],
  },
  {
    title: "Track & Measure",
    dotColor: "#1D9E75",
    items: [
      { href: "/progress", label: "Progress", icon: TrendingUp },
      { href: "/consistency-tracker", label: "Consistency Tracker", icon: BarChart3 },
      { href: "/syllabus", label: "Syllabus Tracker", icon: BookOpen },
      { href: "/target-score-blueprint", label: "Target Score Blueprint", icon: Target },
      { href: "/my-target", label: "My Target", icon: Bookmark },
    ],
  },
  {
    title: "Learn & Revise",
    dotColor: "#7F77DD",
    items: [
      { href: "/revision-engine", label: "Revision Engine", icon: PenTool },
      { href: "/revision-reminders", label: "Revision Reminders", icon: AlarmClock },
      { href: "/doubts", label: "Doubt Tracker", icon: HelpCircle },
      { href: "/prepbrain", label: "PrepBrain AI", icon: Brain },
      { href: "/study-sessions", label: "On-camera Sessions", icon: Camera },
    ],
  },
  {
    title: "Mindset & Discipline",
    dotColor: "#D4537E",
    items: [
      { href: "/habits", label: "Habit Maker", icon: CheckCircle },
      { href: "/motivation", label: "Personal Motivation", icon: MessageSquare },
      { href: "/meditation", label: "Brain Yoga / Meditation", icon: Flower2 },
    ],
  },
];

export function KalnehiSidebar() {
  const pathname = usePathname();

  return (
    <nav
      role="navigation"
      aria-label="Feature navigation"
      className="hidden w-[220px] shrink-0 overflow-y-auto border-r border-kal-border/60 bg-[#FAF8F4] pt-4 pb-10 dark:bg-zinc-950/80 lg:flex lg:flex-col"
      style={{ borderColor: "var(--kal-border)" }}
    >
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

      {SIDEBAR_CATEGORIES.map((cat) => (
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
          {ACCOUNT_ITEMS.map((item) => {
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
