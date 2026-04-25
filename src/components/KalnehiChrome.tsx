"use client";

import clsx from "clsx";
import { Bell, Menu, MicVocal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useEffect,
  useState,
} from "react";

import { GlobalVoiceSheet } from "@/components/voice/GlobalVoiceSheet";
import { Day3Paywall } from "@/components/paywall/Day3Paywall";
import {
  ProductTour,
  readProductTourPending,
} from "@/components/onboarding/ProductTour";
import { useVoiceCommandStore } from "@/store/useVoiceCommandStore";

import { WelcomeMorningHost } from "@/components/welcome/WelcomeMorningHost";
import { KalnehiMark } from "@/components/KalnehiMark";
import { PwaInstallPromptDeferred } from "@/components/PwaInstallPromptDeferred";
import { FreeTrialWelcomeBanner } from "@/components/subscription/FreeTrialWelcomeBanner";
import { QuietSavedToast } from "@/components/QuietSavedToast";
import { SyncStatusBanner } from "@/components/SyncStatusBanner";
import { UndoToast } from "@/components/ui/UndoToast";
import { TimerVisibilityBridge } from "@/components/task/TimerVisibilityBridge";
import { BottomTabBar } from "@/components/nav/BottomTabBar";
import { KalnehiSidebar } from "@/components/nav/KalnehiSidebar";
import { MainNavigationMenu } from "@/components/MainNavigationMenu";

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
  const [showTour, setShowTour] = useState(false);
  const { open: openVoice, close: closeVoice, isOpen: voiceOpen } = useVoiceCommandStore();

  // Show product tour on first /home visit after onboarding completes
  useEffect(() => {
    if (pathname === "/home" && readProductTourPending()) {
      setShowTour(true);
    }
  }, [pathname]);
  const onboarding = pathname === "/onboarding";
  const minimalChrome = MINIMAL_CHROME_PATHS.has(pathname);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[KalnehiChrome] mounted", { path: pathname });
    }
  }, [pathname]);

  // Global keyboard shortcut: Cmd+. (Mac) / Ctrl+. (Windows/Linux) toggles voice.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === ".") {
        e.preventDefault();
        if (voiceOpen) {
          closeVoice();
        } else {
          openVoice();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [voiceOpen, openVoice, closeVoice]);

  if (onboarding) {
    return (
      <div
        className="flex min-h-full min-h-dvh flex-col bg-kal-page text-kal-text pt-[env(safe-area-inset-top)] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </div>
    );
  }

  if (pathname.startsWith("/welcome/")) {
    return (
      <div className="flex min-h-full min-h-dvh w-full justify-center overflow-x-hidden">
        <div className="relative min-h-dvh min-h-0 w-full max-w-[390px] flex-1">
          {children}
        </div>
      </div>
    );
  }

  if (minimalChrome) {
    return (
      <div className="flex min-h-full min-h-dvh flex-col bg-kal-page text-kal-text">
        <header className="kal-glass-header sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
          <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-3 px-3 sm:h-[3.5rem] sm:gap-4 sm:px-6 xl:px-8">
            <Link
              href="/home"
              className="flex shrink-0 items-center rounded-xl py-1 outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-kal-accent/40"
              aria-label="Dashboard"
            >
              <KalnehiMark
                aria-hidden
                className="h-8 w-auto max-w-[min(100%,7.5rem)] object-contain object-left sm:h-9 sm:max-w-[8.5rem]"
              />
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
        <div className="mx-auto w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 max-w-lg md:max-w-5xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[90rem] md:px-8 xl:px-10 xl:py-10 2xl:px-12">
          {children}
        </div>
        {menuOpen ? (
          <MainNavigationMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
        ) : null}
        <UndoToast />
        <QuietSavedToastBoundary>
          <QuietSavedToast />
        </QuietSavedToastBoundary>
        <TimerVisibilityBridge />
        <PwaInstallPromptDeferred />
      </div>
    );
  }

  return (
    <div className="kal-chrome-root flex min-h-full min-h-dvh flex-col bg-kal-page text-kal-text">
      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <header className="kal-glass-header sticky top-0 z-40 shrink-0 pt-[env(safe-area-inset-top)]">
        <div className="flex h-[52px] w-full items-center justify-between gap-2 px-3 sm:h-[52px] sm:px-5">
          {/* Logo */}
          <Link
            href="/home"
            className="flex shrink-0 items-center rounded-xl py-1 outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-kal-accent/40"
            aria-label="Dashboard"
          >
            <KalnehiMark
              aria-hidden
              className="h-7 w-auto max-w-[min(100%,6.5rem)] object-contain object-left sm:h-8"
            />
          </Link>

          {/* Right controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={openVoice}
              aria-label="Voice command"
              aria-pressed={voiceOpen}
              data-tour="voice"
              className={clsx(
                "flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-xl border backdrop-blur-md transition-colors active:scale-[0.98]",
                voiceOpen
                  ? "border-kal-accent/35 bg-kal-accent-soft text-kal-accent shadow-sm"
                  : "border-white/30 bg-white/45 text-kal-accent hover:border-white/45 hover:bg-white/65 dark:border-white/12 dark:bg-zinc-900/50",
              )}
            >
              <MicVocal className="h-4.5 w-4.5 shrink-0" strokeWidth={2.25} aria-hidden />
            </button>
            <Link
              href="/notifications"
              className={clsx(
                "flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-xl border backdrop-blur-md transition-colors active:scale-[0.98]",
                pathname === "/notifications"
                  ? "border-kal-accent/35 bg-kal-accent-soft text-kal-accent shadow-sm"
                  : "border-white/30 bg-white/45 text-kal-accent hover:border-white/45 hover:bg-white/65 dark:border-white/12 dark:bg-zinc-900/50",
              )}
              aria-label="Notifications"
            >
              <Bell className="h-4.5 w-4.5 shrink-0" strokeWidth={2.25} aria-hidden />
            </Link>

            {/* Hamburger — always visible for settings/legal/support/saved-plans */}
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-xl border border-white/25 bg-white/40 text-kal-text-secondary backdrop-blur-md transition-colors hover:border-white/40 hover:bg-white/55 active:scale-[0.98] dark:border-white/12 dark:bg-zinc-900/50"
              aria-expanded={menuOpen}
              aria-label="Open navigation menu"
              data-tour="menu"
            >
              <Menu className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Body: sidebar + content ─────────────────────────────────────── */}
      <div className="kal-chrome-body flex min-w-0 flex-1">
        {/* Desktop sidebar — hidden below lg (900px) */}
        <KalnehiSidebar />

        {/* Main content area */}
        <div className="kal-chrome-main-scroll flex min-w-0 flex-1 flex-col">
          <main
            className={clsx(
              "mx-auto w-full flex-1 px-4 py-6 sm:px-6 sm:py-8",
              "max-w-[960px]",
              "md:px-8 xl:py-10",
              // Extra bottom padding on mobile for fixed tab bar
              "pb-[calc(56px+env(safe-area-inset-bottom))] lg:pb-10",
            )}
          >
            <SyncStatusBanner />
            <FreeTrialWelcomeBanner />
            {children}
          </main>
        </div>
      </div>

      <WelcomeMorningHost />

      {/* ── Mobile bottom tab bar — hidden at lg+ ───────────────────────── */}
      <BottomTabBar />

      {menuOpen ? (
        <MainNavigationMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      ) : null}
      <UndoToast />
      <QuietSavedToastBoundary>
        <QuietSavedToast />
      </QuietSavedToastBoundary>
      <TimerVisibilityBridge />
      <PwaInstallPromptDeferred />
      <GlobalVoiceSheet />
      <Day3Paywall />
      {showTour && (
        <ProductTour onComplete={() => setShowTour(false)} />
      )}
    </div>
  );
}
