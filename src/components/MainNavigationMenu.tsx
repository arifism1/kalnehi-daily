"use client";

import clsx from "clsx";
import {
  BarChart3,
  BookOpen,
  Calendar,
  CalendarDays,
  CircleHelp,
  ClipboardList,
  Download,
  Flame,
  Home,
  Inbox,
  Menu,
  Mic,
  RotateCcw,
  ScrollText,
  Settings,
  Timer,
  UserRound,
  Video,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { isStandalonePwa, usePwaInstall } from "@/hooks/usePwaInstall";

type MainNavigationMenuProps = {
  open: boolean;
  onClose: () => void;
  /** Account sheet with quick toggles & sign out. */
  onOpenAccount?: () => void;
  /** Full-page handwritten paste flow (signed-in only). */
  pasteHandwrittenHref?: string;
};

function navActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const LINKS: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/", label: "Dashboard (Home)", Icon: Home },
  { href: "/syllabus", label: "Syllabus Tracker", Icon: BookOpen },
  { href: "/plan", label: "Execution Planner", Icon: CalendarDays },
  { href: "/daily-log", label: "Daily Log", Icon: ScrollText },
  { href: "/dictate-day", label: "Dictate My Day", Icon: Mic },
  { href: "/study-sessions", label: "Study Sessions", Icon: Video },
  { href: "/progress", label: "Progress", Icon: BarChart3 },
  { href: "/doubts", label: "Doubt Tracker", Icon: CircleHelp },
  { href: "/consistency-tracker", label: "Consistency Tracker", Icon: Calendar },
  { href: "/revision", label: "Revision Engine", Icon: RotateCcw },
  { href: "/heatmap", label: "Heatmap", Icon: Flame },
  { href: "/timer", label: "Timer", Icon: Timer },
  { href: "/pending", label: "Pending Tasks", Icon: Inbox },
  { href: "/profile", label: "Profile", Icon: UserRound },
  { href: "/settings", label: "Settings", Icon: Settings },
];

export function MainNavigationMenu({
  open,
  onClose,
  onOpenAccount,
  pasteHandwrittenHref,
}: MainNavigationMenuProps) {
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
          "absolute inset-x-0 bottom-0 flex max-h-[min(92vh,100dvh)] flex-col overflow-hidden rounded-t-[1.25rem] border border-kal-border bg-kal-card kal-shadow-card transition-transform duration-200 ease-out sm:bottom-auto sm:left-auto sm:right-0 sm:top-0 sm:h-full sm:max-h-none sm:max-w-md sm:rounded-none sm:rounded-bl-[1.25rem] sm:border-l sm:border-t-0",
          open ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-y-0 sm:translate-x-full",
        )}
      >
        <div className="flex shrink-0 justify-center pt-2 pb-1 sm:hidden">
          <div
            className="h-1 w-10 rounded-full bg-kal-border"
            aria-hidden
          />
        </div>
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
            {onOpenAccount ? (
              <li>
                <button
                  type="button"
                  onClick={onOpenAccount}
                  className="flex min-h-[56px] w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-kal-card-muted active:bg-kal-card-muted"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-kal-card-muted text-kal-accent">
                    <UserRound className="h-6 w-6" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-kal-text">
                    Account
                  </span>
                </button>
              </li>
            ) : null}
            {pasteHandwrittenHref ? (
              <li>
                <Link
                  href={pasteHandwrittenHref}
                  onClick={onClose}
                  className={clsx(
                    "flex min-h-[56px] items-center gap-4 rounded-2xl px-3 py-3 transition-colors",
                    navActive(pathname, pasteHandwrittenHref)
                      ? "bg-kal-accent-soft ring-1 ring-kal-accent/25"
                      : "hover:bg-kal-card-muted active:bg-kal-card-muted",
                  )}
                >
                  <span
                    className={clsx(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                      navActive(pathname, pasteHandwrittenHref)
                        ? "bg-kal-accent/20 text-kal-accent-dark dark:text-kal-accent"
                        : "bg-kal-card-muted text-kal-muted",
                    )}
                  >
                    <ClipboardList className="h-6 w-6" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-kal-text">
                    Paste Handwritten Daily Plan
                  </span>
                </Link>
              </li>
            ) : null}

            {LINKS.map(({ href, label, Icon }) => {
              const active = navActive(pathname, href);
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

            <li className="pt-1">
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
