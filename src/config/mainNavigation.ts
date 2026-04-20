import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bookmark,
  BookOpen,
  Brain,
  Calendar,
  CalendarDays,
  Camera,
  CheckCircle,
  Clock,
  Crown,
  Flower2,
  Heart,
  HelpCircle,
  Home,
  Inbox,
  Mic,
  LifeBuoy,
  RotateCw,
  Settings,
  Shield,
  Sparkles,
  Target,
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
  /** Opens in-menu UI (e.g. contact modal) instead of navigating */
  menuAction?: "contact-support";
  /**
   * The dashboard feature id this nav item corresponds to (matches
   * DASHBOARD_FEATURES[n].id). When set the item is hidden from both the
   * quick-nav bar and the hamburger menu whenever the user has customised their
   * features and this id is not in the enabled list.
   * Items without a featureId are always visible (Home, Settings, Profile …).
   */
  featureId?: string;
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
      { href: "/", label: "Home", shortLabel: "Home", Icon: Home },
      { href: "/plan-my-day", label: "Plan My Day", Icon: Sparkles, featureId: "plan-my-day" },
      {
        href: "/daily-plan",
        label: "Daily Plan",
        shortLabel: "Daily plan",
        Icon: Calendar,
        featureId: "daily-planner",
      },
      {
        href: "/saved-plans",
        label: "Saved Daily Plans",
        shortLabel: "Saved plans",
        Icon: CalendarDays,
      },
      {
        href: "/dictate-day",
        label: "Dictate My Day",
        shortLabel: "Dictate",
        Icon: Mic,
        featureId: "dictate-my-day",
      },
      {
        href: "/prepbrain",
        label: "PrepBrain AI",
        shortLabel: "PrepBrain",
        Icon: Brain,
        featureId: "prepbrain-ai",
      },
      { href: "/syllabus", label: "Syllabus Mastery Tracker", shortLabel: "Syllabus", Icon: BookOpen, featureId: "syllabus-mastery-tracker" },
      {
        href: "/target-score-blueprint",
        label: "Target Score Blueprint",
        shortLabel: "Blueprint",
        Icon: Target,
        featureId: "target-score-blueprint",
      },
      {
        href: "/my-target",
        label: "My Target",
        shortLabel: "My Target",
        Icon: Bookmark,
        featureId: "my-target",
      },
      { href: "/pending", label: "Pending Tasks", shortLabel: "Pending", Icon: Inbox, featureId: "pending-tasks" },
      { href: "/doubts", label: "Doubt Tracker", shortLabel: "Doubts", Icon: HelpCircle, featureId: "doubt-tracker" },
    ],
  },
  {
    title: "Execution",
    quickNavGroupLabel: "Execution",
    items: [
      {
        href: "/study-sessions",
        label: "On-camera sessions",
        shortLabel: "Camera",
        Icon: Camera,
        featureId: "study-sessions",
      },
      { href: "/timer", label: "Timer", Icon: Clock, featureId: "timer" },
    ],
  },
  {
    title: "Study Tools",
    quickNavGroupLabel: "Study",
    items: [
      {
        href: "/revision-engine",
        label: "Smart Revision Engine",
        shortLabel: "Revision",
        Icon: RotateCw,
        featureId: "revision-engine",
      },
    ],
  },
  {
    title: "Review & Analysis",
    quickNavGroupLabel: "Review",
    items: [
      { href: "/progress", label: "Progress", Icon: TrendingUp, featureId: "progress" },
      {
        href: "/consistency-tracker",
        label: "Consistency Tracker",
        shortLabel: "Consistency",
        Icon: BarChart3,
        featureId: "consistency-tracker",
      },
    ],
  },
  {
    title: "Growth Tools",
    quickNavGroupLabel: "Growth",
    items: [
      { href: "/habits", label: "Habit Maker", shortLabel: "Habits", Icon: CheckCircle, featureId: "habit-maker" },
      {
        href: "/motivation",
        label: "Personal Motivation",
        shortLabel: "Motivation",
        Icon: Heart,
        featureId: "personal-motivation",
      },
      { href: "/meditation", label: "Brain Yoga", Icon: Flower2, featureId: "brain-yoga" },
    ],
  },
  {
    title: "Account & Legal",
    quickNavGroupLabel: "Account",
    items: [
      {
        href: "/policies",
        label: "Our Policies",
        shortLabel: "Policies",
        Icon: Shield,
        isActive: policyHubActive,
      },
      { href: "/profile", label: "Profile", Icon: User },
      { href: "/settings", label: "Settings", Icon: Settings },
      {
        href: "#",
        label: "Contact support",
        shortLabel: "Support",
        Icon: LifeBuoy,
        menuAction: "contact-support",
      },
      { href: "/my-plan", label: "My Plan", Icon: Crown },
    ],
  },
];

/**
 * Returns only the nav sections/items that are enabled given the user's feature
 * selection. Items without a featureId are always included.
 * Pass `null` to get everything (no customisation applied).
 */
export function filterNavByEnabledFeatures(
  sections: MainNavSection[],
  enabledFeatures: string[] | null,
): MainNavSection[] {
  if (enabledFeatures === null) return sections;
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.featureId || enabledFeatures.includes(item.featureId),
      ),
    }))
    .filter((section) => section.items.length > 0);
}

/**
 * Quick-nav strip order: earlier = typical daily use first (hub → plan → study → review → rest).
 * Full menu in {@link MAIN_NAV_SECTIONS} stays grouped by theme.
 */
const QUICK_NAV_HREF_ORDER: readonly string[] = [
  "/",
  "/daily-plan",
  "/saved-plans",
  "/dictate-day",
  "/prepbrain",
  "/plan-my-day",
  "/syllabus",
  "/target-score-blueprint",
  "/my-target",
  "/pending",
  "/doubts",
  "/timer",
  "/study-sessions",
  "/progress",
  "/consistency-tracker",
  "/habits",
  "/motivation",
  "/meditation",
];

/** Not shown in the top quick strip (use the main menu or header links). */
const QUICK_NAV_EXCLUDED_HREFS = new Set([
  "/profile",
  "/settings",
  "/my-plan",
  "/policies",
  "/revision-engine",
]);

function quickNavOrderIndex(href: string): number {
  const i = QUICK_NAV_HREF_ORDER.indexOf(href);
  return i === -1 ? 1000 : i;
}

/**
 * All routes eligible for the top quick bar in default order, with feature filtering applied.
 * (Does not apply per-user quick-nav customisation; used as the allowlist and settings checklist.)
 */
export function getDefaultQuickNavItemsInOrder(
  enabledFeatures: string[] | null = null,
): MainNavItem[] {
  const flat = MAIN_NAV_SECTIONS.flatMap((s) => s.items).filter(
    (item) =>
      !item.menuAction &&
      !QUICK_NAV_EXCLUDED_HREFS.has(item.href) &&
      (enabledFeatures === null || !item.featureId || enabledFeatures.includes(item.featureId)),
  );
  return [...flat].sort(
    (a, b) => quickNavOrderIndex(a.href) - quickNavOrderIndex(b.href),
  );
}

/**
 * flat list of nav items for the scrolling quick bar, frequency-sorted.
 * @param quickNavHrefs `null` = all defaults. `[]` = none. Otherwise only listed hrefs, in that order
 *  (stale or disabled-feature hrefs are dropped).
 */
export function getMainNavItemsInQuickNavOrder(
  enabledFeatures: string[] | null = null,
  quickNavHrefs: string[] | null = null,
): MainNavItem[] {
  const defaultList = getDefaultQuickNavItemsInOrder(enabledFeatures);
  if (quickNavHrefs === null) {
    return defaultList;
  }
  if (quickNavHrefs.length === 0) {
    return [];
  }
  const byHref = new Map(defaultList.map((it) => [it.href, it] as const));
  const out: MainNavItem[] = [];
  const seen = new Set<string>();
  for (const h of quickNavHrefs) {
    if (seen.has(h) || typeof h !== "string") continue;
    const item = byHref.get(h);
    if (item) {
      out.push(item);
      seen.add(h);
    }
  }
  return out;
}
