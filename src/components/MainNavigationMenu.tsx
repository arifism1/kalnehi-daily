"use client";

import clsx from "clsx";
import {
  BarChart3,
  BookOpen,
  Calendar,
  CalendarDays,
  CircleHelp,
  Download,
  Flame,
  Heart,
  Home,
  Inbox,
  ListChecks,
  Menu,
  RotateCcw,
  Scale,
  ScrollText,
  Settings,
  Sparkles,
  Sunrise,
  Timer,
  UserRound,
  Video,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useState } from "react";

import { isStandalonePwa, usePwaInstall } from "@/hooks/usePwaInstall";

type MainNavigationMenuProps = {
  open: boolean;
  onClose: () => void;
};

function navActive(pathname: string, href: string): boolean {
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

function policyHubActive(pathname: string): boolean {
  return POLICY_HUB_PATHS.has(pathname);
}

type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  /** Override default pathname-based active state */
  isActive?: (pathname: string) => boolean;
};

const MENU_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Core Daily Flow",
    items: [
      { href: "/", label: "Dashboard (Home)", Icon: Home },
      { href: "/plan-my-day", label: "Plan My Day", Icon: Sparkles },
      { href: "/syllabus", label: "Syllabus Tracker", Icon: BookOpen },
    ],
  },
  {
    title: "Execution",
    items: [
      { href: "/plan", label: "Execution Planner", Icon: CalendarDays },
      { href: "/study-sessions", label: "Study Sessions", Icon: Video },
      { href: "/timer", label: "Timer", Icon: Timer },
    ],
  },
  {
    title: "Review & Analysis",
    items: [
      { href: "/progress", label: "Progress", Icon: BarChart3 },
      { href: "/daily-log", label: "Daily Log", Icon: ScrollText },
      { href: "/revision", label: "Revision Engine", Icon: RotateCcw },
      { href: "/heatmap", label: "Heatmap", Icon: Flame },
      { href: "/consistency-tracker", label: "Consistency Tracker", Icon: Calendar },
    ],
  },
  {
    title: "Growth Tools",
    items: [
      { href: "/habits", label: "Habit Maker", Icon: ListChecks },
      { href: "/motivation", label: "Personal Motivation", Icon: Heart },
      { href: "/meditation", label: "Meditation", Icon: Sunrise },
      { href: "/doubts", label: "Doubt Tracker", Icon: CircleHelp },
    ],
  },
  {
    title: "Account & Legal",
    items: [
      { href: "/pending", label: "Pending Tasks", Icon: Inbox },
      {
        href: "/policies",
        label: "Our Policies",
        Icon: Scale,
        isActive: policyHubActive,
      },
      { href: "/profile", label: "Profile", Icon: UserRound },
      { href: "/settings", label: "Settings", Icon: Settings },
    ],
  },
];

export function MainNavigationMenu({ open, onClose }: MainNavigationMenuProps) {
  const pathname = usePathname();
  const { installed, canPromptInstall, showIosInstructions, promptInstall } =
    usePwaInstall();
  const [installBusy, setInstallBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      className={clsx(
        "fixed inset-0 z-[55] transition-[visibility] duration-200",
        open ? "visible" : "invisible delay-200",
      )}
    >
      <button
        type="button"
        aria-label="Close menu"
        className={clsx(
          "absolute inset-0 bg-[var(--kal-overlay)] transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />
      <div
        className={clsx(
          "absolute bottom-0 right-0 top-0 flex h-full w-[min(92vw,24rem)] max-w-md flex-col overflow-hidden rounded-l-[1.25rem] border border-kal-border border-r-0 bg-kal-card kal-shadow-card transition-transform duration-200 ease-out sm:w-[min(80vw,24rem)]",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-kal-border px-4 py-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-kal-accent-soft text-kal-accent">
            <Menu className="h-6 w-6" strokeWidth={2.25} />
          </div>
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
              Navigate
            </p>
            <p className="text-base font-semibold text-kal-text">Kalnehi Daily</p>
          </div>
        </div>

        <nav
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
          aria-label="Main"
        >
          <ul className="space-y-0.5">
            {MENU_SECTIONS.map((section, sectionIndex) => (
              <Fragment key={section.title}>
                <li
                  className={clsx(
                    "list-none px-3 pb-1 pt-2",
                    sectionIndex > 0 && "mt-5 sm:mt-6",
                  )}
                >
                  <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-muted">
                    {section.title}
                  </p>
                </li>
                {section.items.map(({ href, label, Icon, isActive }) => {
                  const active = isActive
                    ? isActive(pathname)
                    : navActive(pathname, href);
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={onClose}
                        className={clsx(
                          "flex min-h-[56px] items-center gap-4 rounded-2xl px-3 py-3 transition-colors",
                          active
                            ? "bg-kal-accent-soft ring-1 ring-kal-accent/25"
                            : "hover:bg-kal-card-muted active:bg-kal-card-muted",
                        )}
                      >
                        <span
                          className={clsx(
                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                            active
                              ? "bg-kal-accent/20 text-kal-accent-dark dark:text-kal-accent"
                              : "bg-kal-card-muted text-kal-muted",
                          )}
                        >
                          <Icon className="h-6 w-6" strokeWidth={2} />
                        </span>
                        <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-kal-text">
                          {label}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </Fragment>
            ))}

            <li className="pt-3">
              <div
                className={clsx(
                  "rounded-2xl border px-3 py-4",
                  installed
                    ? "border-kal-accent/30 bg-kal-accent-soft"
                    : "border-kal-accent/40 bg-kal-accent-soft",
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-kal-accent/25 text-kal-accent-dark dark:text-kal-accent">
                    <Download className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-kal-text">
                      Install on phone
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-kal-muted">
                      Add to Home Screen — faster launch, calmer sessions.
                    </p>
                    {installed ? (
                      <p className="mt-3 text-sm font-medium text-kal-accent-dark dark:text-kal-accent">
                        You&apos;re running the installed app.
                      </p>
                    ) : (
                      <>
                        {canPromptInstall && (
                          <button
                            type="button"
                            disabled={installBusy}
                            onClick={async () => {
                              setInstallBusy(true);
                              await promptInstall();
                              setInstallBusy(false);
                              if (isStandalonePwa()) onClose();
                            }}
                            className="mt-3 w-full min-h-[48px] rounded-xl bg-kal-accent px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-kal-accent-hover active:scale-[0.99] disabled:opacity-50"
                          >
                            {installBusy ? "Opening…" : "Install on phone"}
                          </button>
                        )}
                        {showIosInstructions && !canPromptInstall && (
                          <div className="mt-3 rounded-xl border border-kal-border bg-kal-card-muted px-3 py-2.5 text-xs leading-relaxed text-kal-text-secondary">
                            <p className="font-medium text-kal-accent-dark dark:text-kal-accent">
                              iPhone &amp; iPad (Safari)
                            </p>
                            <ol className="mt-2 list-decimal space-y-1 pl-4 text-kal-muted">
                              <li>Tap the Share button</li>
                              <li>
                                Tap{" "}
                                <span className="text-kal-text">
                                  Add to Home Screen
                                </span>
                              </li>
                              <li>Open Kalnehi from your home screen</li>
                            </ol>
                          </div>
                        )}
                        {!canPromptInstall && !showIosInstructions && (
                          <p className="mt-3 text-[11px] leading-relaxed text-kal-muted">
                            Android / desktop: use your browser menu → Install
                            app, or Add to Home screen.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
