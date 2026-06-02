"use client";

import clsx from "clsx";
import { BookOpen, Grid2x2, Calendar, LayoutDashboard, User, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_DASHBOARD_PATH, APP_HOME_PATH } from "@/config/appRoutes";

type Tab = {
  href: string;
  /** Short label for the tab chip (keep narrow — six tabs share one row). */
  label: string;
  /** Overrides `label` for assistive tech when the visible label is abbreviated */
  ariaLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Match exact path or prefix */
  matchPrefix?: boolean;
  /** Hide the text label on very narrow screens (≤360px) to reduce crowding */
  noLabelOnNarrow?: boolean;
};

const TABS: Tab[] = [
  {
    href: APP_HOME_PATH,
    label: "Home",
    ariaLabel: "Syllabus Tracker",
    icon: BookOpen,
    matchPrefix: true,
  },
  { href: "/daily-plan", label: "Plan", icon: Calendar, matchPrefix: true },
  {
    href: APP_DASHBOARD_PATH,
    label: "Dashboard",
    icon: LayoutDashboard,
    matchPrefix: true,
  },
  { href: "/study-squad", label: "Squad", icon: Users, matchPrefix: true },
  { href: "/features", label: "Features", icon: Grid2x2, matchPrefix: true, noLabelOnNarrow: true },
  { href: "/profile", label: "Profile", icon: User, matchPrefix: true, noLabelOnNarrow: true },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      data-kal-bottom-tabs
      data-tour="bottom-tabs"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-kal-border/60 bg-white pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] dark:bg-zinc-950 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex min-h-14 items-stretch">
        {TABS.map((tab) => {
          const isActive =
            tab.matchPrefix
              ? pathname === tab.href || pathname.startsWith(`${tab.href}/`)
              : pathname === tab.href;
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex min-w-0 flex-1 items-stretch">
              <Link
                href={tab.href}
                aria-label={tab.ariaLabel}
                aria-current={isActive ? "page" : undefined}
                className={clsx(
                  "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 outline-none",
                  "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#BA7517]/50",
                  "transition-colors",
                  isActive ? "text-[#BA7517]" : "text-kal-muted",
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                <span
                  className={clsx(
                    "w-full max-w-full truncate text-center text-[10px] font-medium leading-none tracking-wide",
                    isActive ? "text-[#BA7517]" : "text-kal-muted",
                    tab.noLabelOnNarrow && "max-[360px]:hidden",
                  )}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <span
                    className="absolute bottom-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-t-full bg-[#BA7517]"
                    aria-hidden
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
