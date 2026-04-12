"use client";

import clsx from "clsx";
import { Bell, Calendar, Menu, Mic } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useEffect,
  useState,
} from "react";

import { MainNavigationMenu } from "@/components/MainNavigationMenu";
import { QuickNavBar } from "@/components/QuickNavBar";
import { QuietSavedToast } from "@/components/QuietSavedToast";
import { SyncStatusBanner } from "@/components/SyncStatusBanner";
import { UndoToast } from "@/components/ui/UndoToast";
import { TimerVisibilityBridge } from "@/components/task/TimerVisibilityBridge";
class QuietSavedToastBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("[KalnehiChrome] QuietSavedToast error (non-fatal)", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

const MINIMAL_CHROME_PATHS = new Set([
  "/policies",
  "/privacy",
  "/terms",
  "/refund",
  "/shipping",
  "/return",
  "/about",
  "/pricing",
]);

export function KalnehiChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const onboarding = pathname === "/onboarding";
  const minimalChrome = MINIMAL_CHROME_PATHS.has(pathname);

  useEffect(() => {
    console.log("[KalnehiChrome] mounted", { path: pathname });
  }, [pathname]);

  return (
    <div className="flex min-h-full min-h-dvh flex-col bg-kal-page text-kal-text">
      <div className="flex min-w-0 flex-1 flex-col">
        {!onboarding && minimalChrome && (
          <header className="kal-glass-header sticky top-0 z-40">
            <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:h-[3.5rem] sm:px-6 xl:px-8">
              <Link
                href="/"
                className="flex min-w-0 items-center gap-3 rounded-xl py-1 outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-kal-accent/40"
                aria-label="Dashboard"
              >
                <Image
                  src="/icon-192x192.png"
                  alt=""
                  width={48}
                  height={48}
                  className="h-10 w-10 flex-shrink-0 object-contain ring-1 ring-white/30 dark:ring-white/15"
                />
                <span className="text-lg font-semibold tracking-tight text-black dark:text-white">
                  kalnehi
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/25 bg-white/40 text-kal-text-secondary backdrop-blur-md transition-colors hover:border-white/40 hover:bg-white/55 active:scale-[0.98] dark:border-white/12 dark:bg-zinc-900/50 dark:hover:bg-zinc-900/70"
                aria-expanded={menuOpen}
                aria-label="Open navigation menu"
              >
                <Menu className="h-6 w-6" strokeWidth={2} />
              </button>
            </div>
          </header>
        )}
        {!onboarding && !minimalChrome && (
          <header className="kal-glass-header sticky top-0 z-40">
            <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:h-[3.5rem] sm:px-6 xl:px-8">
              <Link
                href="/"
                className="flex min-w-0 items-center gap-3 rounded-xl py-1 outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-kal-accent/40"
                aria-label="Dashboard"
              >
                <Image
                  src="/icon-192x192.png"
                  alt=""
                  width={48}
                  height={48}
                  className="h-10 w-10 flex-shrink-0 object-contain ring-1 ring-white/30 dark:ring-white/15"
                />
                <span className="text-lg font-semibold tracking-tight text-black dark:text-white">
                  kalnehi
                </span>
              </Link>
              <div className="flex min-w-0 shrink-0 items-center gap-0.5 sm:gap-1">
                <Link
                  href="/notifications"
                  className={clsx(
                    "flex h-11 min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-2 text-kal-accent backdrop-blur-md transition-colors active:scale-[0.98] sm:min-w-0 sm:px-3",
                    pathname === "/notifications"
                      ? "border-kal-accent/35 bg-kal-accent-soft shadow-sm ring-1 ring-kal-accent/20"
                      : "border-white/30 bg-white/45 hover:border-white/45 hover:bg-white/65 dark:border-white/12 dark:bg-zinc-900/50 dark:hover:border-white/18 dark:hover:bg-zinc-900/72",
                  )}
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
                  <span className="hidden text-[11px] font-semibold leading-tight sm:inline sm:text-xs">
                    Alerts
                  </span>
                </Link>
                <Link
                  href="/daily-plan"
                  className={clsx(
                    "flex h-11 min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-2 text-kal-accent backdrop-blur-md transition-colors active:scale-[0.98] sm:min-w-0 sm:px-3",
                    pathname === "/daily-plan" || pathname === "/plan-my-day"
                      ? "border-kal-accent/35 bg-kal-accent-soft shadow-sm ring-1 ring-kal-accent/20"
                      : "border-white/30 bg-white/45 hover:border-white/45 hover:bg-white/65 dark:border-white/12 dark:bg-zinc-900/50 dark:hover:border-white/18 dark:hover:bg-zinc-900/72",
                  )}
                  aria-label="Daily planner"
                >
                  <Calendar
                    className="h-5 w-5 shrink-0"
                    strokeWidth={2.25}
                    aria-hidden
                  />
                  <span className="hidden max-w-[6rem] truncate text-[11px] font-semibold leading-tight sm:inline sm:max-w-none sm:text-xs">
                    Daily plan
                  </span>
                </Link>
                <Link
                  href="/dictate-day"
                  className={clsx(
                    "flex h-11 min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-2 text-kal-accent backdrop-blur-md transition-colors active:scale-[0.98] sm:min-w-0 sm:px-3",
                    pathname === "/dictate-day"
                      ? "border-kal-accent/35 bg-kal-accent-soft shadow-sm ring-1 ring-kal-accent/20"
                      : "border-white/30 bg-white/45 hover:border-white/45 hover:bg-white/65 dark:border-white/12 dark:bg-zinc-900/50 dark:hover:border-white/18 dark:hover:bg-zinc-900/72",
                  )}
                  aria-label="Dictate My Day"
                >
                  <Mic className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
                  <span className="hidden text-[11px] font-semibold leading-tight sm:inline sm:text-xs">
                    Dictate My Day
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/25 bg-white/40 text-kal-text-secondary backdrop-blur-md transition-colors hover:border-white/40 hover:bg-white/55 active:scale-[0.98] dark:border-white/12 dark:bg-zinc-900/50 dark:hover:bg-zinc-900/70"
                  aria-expanded={menuOpen}
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-6 w-6" strokeWidth={2} />
                </button>
              </div>
            </div>
          </header>
        )}

        {!onboarding && (
          <div className="sticky top-14 z-30 border-b border-white/20 bg-white/55 backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/65 sm:top-[3.5rem]">
            <div
              className={clsx(
                "mx-auto w-full px-4 sm:px-6 md:px-8 xl:px-10",
                "max-w-lg md:max-w-5xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[90rem]",
              )}
            >
              <QuickNavBar />
            </div>
          </div>
        )}

        <main
          className={clsx(
            "mx-auto w-full flex-1 px-4 py-6 sm:px-6 sm:py-8",
            "max-w-lg md:max-w-5xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[90rem]",
            "md:px-8 xl:px-10 xl:py-10 2xl:px-12",
            "pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]",
          )}
        >
          {!onboarding && !minimalChrome && <SyncStatusBanner />}
          {children}
        </main>
      </div>

      <MainNavigationMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <UndoToast />
      <QuietSavedToastBoundary>
        <QuietSavedToast />
      </QuietSavedToastBoundary>
      <TimerVisibilityBridge />
    </div>
  );
}
