import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Brain,
  Calendar,
  CheckCircle,
  Clock,
  Crown,
  Flower2,
  Heart,
  HelpCircle,
  Home,
  Image,
  Inbox,
  Mic,
  Notebook,
  PlayCircle,
  RotateCw,
  Settings,
  Shield,
  Sparkles,
  TrendingUp,
  User,
} from "lucide-react";

export function navActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const POLICY_HUB_PATHS = new Set([
  "/policies",
  "/privacy",
  "/terms",
  "/refund",
  "/shipping",
  "/return",
  "/about",
]);

export function policyHubActive(pathname: string): boolean {
  return POLICY_HUB_PATHS.has(pathname);
}

export type MainNavItem = {
  href: string;
  label: string;
  /** Shorter label for compact UI (e.g. home quick nav chips). */
  shortLabel?: string;
  Icon: LucideIcon;
  /** Override default pathname-based active state */
  isActive?: (pathname: string) => boolean;
};

export type MainNavSection = {
  title: string;
  /** Short tag for inline grouping in quick nav (e.g. "Core"). */
  quickNavGroupLabel?: string;
  items: MainNavItem[];
};

export const MAIN_NAV_SECTIONS: MainNavSection[] = [
  {
    title: "Core Daily Flow",
    quickNavGroupLabel: "Core",
    items: [
      { href: "/", label: "Dashboard (Home)", shortLabel: "Home", Icon: Home },
      { href: "/plan-my-day", label: "Plan My Day", Icon: Sparkles },
      {
        href: "/daily-plan",
        label: "Daily Planner",
        shortLabel: "Daily plan",
        Icon: Calendar,
      },
      {
        href: "/dictate-day",
        label: "Dictate My Day",
        shortLabel: "Dictate",
        Icon: Mic,
      },
      {
        href: "/paste-handwritten",
        label: "Handwritten Scan",
        shortLabel: "Scan",
        Icon: Image,
      },
      {
        href: "/prepbrain",
        label: "PrepBrain AI",
        shortLabel: "PrepBrain",
        Icon: Brain,
      },
      { href: "/syllabus", label: "Syllabus Tracker", shortLabel: "Syllabus", Icon: BookOpen },
    ],
  },
  {
    title: "Execution",
    quickNavGroupLabel: "Execution",
    items: [
      {
        href: "/study-sessions",
        label: "Study Sessions",
        shortLabel: "Study",
        Icon: PlayCircle,
      },
      { href: "/timer", label: "Timer", Icon: Clock },
    ],
  },
  {
    title: "Review & Analysis",
    quickNavGroupLabel: "Review",
    items: [
      { href: "/progress", label: "Progress", Icon: TrendingUp },
      { href: "/daily-log", label: "Daily Log", Icon: Notebook },
      {
        href: "/revision",
        label: "Revision Engine",
        shortLabel: "Revision",
        Icon: RotateCw,
      },
      {
        href: "/consistency-tracker",
        label: "Consistency Tracker",
        shortLabel: "Consistency",
        Icon: BarChart3,
      },
    ],
  },
  {
    title: "Growth Tools",
    quickNavGroupLabel: "Growth",
    items: [
      { href: "/habits", label: "Habit Maker", shortLabel: "Habits", Icon: CheckCircle },
      {
        href: "/motivation",
        label: "Personal Motivation",
        shortLabel: "Motivation",
        Icon: Heart,
      },
      { href: "/meditation", label: "Brain Yoga", Icon: Flower2 },
      { href: "/doubts", label: "Doubt Tracker", shortLabel: "Doubts", Icon: HelpCircle },
    ],
  },
  {
    title: "Account & Legal",
    quickNavGroupLabel: "Account",
    items: [
      { href: "/pending", label: "Pending Tasks", shortLabel: "Pending", Icon: Inbox },
      {
        href: "/policies",
        label: "Our Policies",
        shortLabel: "Policies",
        Icon: Shield,
        isActive: policyHubActive,
      },
      { href: "/profile", label: "Profile", Icon: User },
      { href: "/settings", label: "Settings", Icon: Settings },
      { href: "/my-plan", label: "My Plan", Icon: Crown },
    ],
  },
];

/**
 * Quick-nav strip order: earlier = typical daily use first (hub → plan → study → review → rest).
 * Full menu in {@link MAIN_NAV_SECTIONS} stays grouped by theme.
 */
const QUICK_NAV_HREF_ORDER: readonly string[] = [
  "/",
  "/daily-plan",
  "/dictate-day",
  "/paste-handwritten",
  "/prepbrain",
  "/plan-my-day",
  "/syllabus",
  "/timer",
  "/study-sessions",
  "/progress",
  "/daily-log",
  "/revision",
  "/consistency-tracker",
  "/habits",
  "/motivation",
  "/meditation",
  "/doubts",
  "/pending",
];

/** Not shown in the top quick strip (use the main menu or header links). */
const QUICK_NAV_EXCLUDED_HREFS = new Set([
  "/profile",
  "/settings",
  "/my-plan",
  "/policies",
]);

function quickNavOrderIndex(href: string): number {
  const i = QUICK_NAV_HREF_ORDER.indexOf(href);
  return i === -1 ? 1000 : i;
}

/** Flat list of nav items for the scrolling quick bar, frequency-sorted. */
export function getMainNavItemsInQuickNavOrder(): MainNavItem[] {
  const flat = MAIN_NAV_SECTIONS.flatMap((s) => s.items).filter(
    (item) => !QUICK_NAV_EXCLUDED_HREFS.has(item.href),
  );
  return [...flat].sort(
    (a, b) => quickNavOrderIndex(a.href) - quickNavOrderIndex(b.href),
  );
}
