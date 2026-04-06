"use client";

import clsx from "clsx";
import { ClipboardList, Menu, Mic, UserCircle } from "lucide-react";
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
import { PasteHandwrittenPlanSheet } from "@/components/planner/PasteHandwrittenPlanSheet";
import { ProfileSheet } from "@/components/ProfileSheet";
import { QuietSavedToast } from "@/components/QuietSavedToast";
import { SyncStatusBanner } from "@/components/SyncStatusBanner";
import { UndoToast } from "@/components/ui/UndoToast";
import { TimerVisibilityBridge } from "@/components/task/TimerVisibilityBridge";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useAuthStore } from "@/store/useAuthStore";

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

export function KalnehiChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const today = useCalendarDate();
  const userId = useAuthStore((s) => s.user?.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const onboarding = pathname === "/onboarding";

  useEffect(() => {
    console.log("[KalnehiChrome] mounted", { path: pathname });
  }, [pathname]);

  return (
    <div className="flex min-h-full min-h-dvh flex-col bg-[#020617] text-zinc-100">
      <div className="flex min-w-0 flex-1 flex-col">
        {!onboarding && (
          <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#020617]/90 backdrop-blur-xl">
            <div className="mx-auto flex h-[3.25rem] w-full max-w-7xl items-center justify-between gap-3 px-3 sm:h-14 sm:px-4 xl:px-6 2xl:px-8">
              <Link
                href="/"
                className="flex min-w-0 items-center gap-2.5 rounded-xl py-1 outline-none transition-opacity hover:opacity-95 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                aria-label="Dashboard"
              >
                <Image
                  src="/icon-192x192.png"
                  alt=""
                  width={36}
                  height={36}
                  className="h-[30px] w-[30px] shrink-0 rounded-lg shadow-lg shadow-emerald-500/10 ring-1 ring-white/10 sm:h-9 sm:w-9"
                />
                <div className="min-w-0 leading-tight">
                  <div className="text-sm font-bold tracking-tight text-white">
                    kalnehi
                  </div>
                  <div className="text-[9px] font-semibold tracking-[0.22em] text-emerald-400/95">
                    WIN DAILY
                  </div>
                </div>
              </Link>
              <div className="flex shrink-0 items-center gap-1">
                {!onboarding && userId ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setPasteOpen(true)}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-emerald-500/35 bg-emerald-950/30 px-2.5 py-2 text-[11px] font-semibold text-emerald-100 transition-all duration-200 hover:bg-emerald-950/50 active:scale-[0.98] sm:px-3"
                      aria-label="Paste Handwritten Plan"
                      title="Paste Handwritten Plan"
                    >
                      <ClipboardList className="h-4 w-4" />
                      <span className="hidden sm:inline">📋 Paste Handwritten Plan</span>
                      <span className="sm:hidden">📋 Paste</span>
                    </button>
                    <Link
                      href="/dictate-day"
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-violet-500/35 bg-violet-950/30 px-2.5 py-2 text-[11px] font-semibold text-violet-100 transition-all duration-200 hover:bg-violet-950/50 active:scale-[0.98] sm:px-3"
                      aria-label="Open Dictate My Day"
                      title="Open Dictate My Day"
                    >
                      <Mic className="h-4 w-4" />
                      <span className="hidden sm:inline">🎙 Dictate My Day</span>
                      <span className="sm:hidden">🎙 Dictate</span>
                    </Link>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() => setMenuOpen(true)}
                  className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl text-zinc-300 transition-all duration-200 hover:bg-white/[0.06] hover:text-white active:scale-[0.98]"
                  aria-expanded={menuOpen}
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-6 w-6" strokeWidth={2.25} />
                </button>
                <button
                  type="button"
                  onClick={() => setProfileOpen(true)}
                  className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white transition-all duration-200 hover:bg-white/[0.06] active:scale-[0.98]"
                  aria-expanded={profileOpen}
                  aria-label="Account"
                >
                  <UserCircle className="h-7 w-7" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </header>
        )}

        <main
          className={clsx(
            "mx-auto w-full flex-1 px-3 py-4 sm:px-5 sm:py-6",
            "max-w-lg md:max-w-5xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[90rem]",
            "md:px-6 xl:px-8 xl:py-8 2xl:px-10",
            "pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]",
          )}
        >
          {!onboarding && <SyncStatusBanner />}
          {children}
        </main>
      </div>

      <MainNavigationMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
      {userId ? (
        <PasteHandwrittenPlanSheet
          open={pasteOpen}
          onClose={() => setPasteOpen(false)}
          assignedDate={today}
          onSaved={() => setPasteOpen(false)}
          onError={(message) => console.log("Paste handwritten plan:", message)}
        />
      ) : null}
      <UndoToast />
      <QuietSavedToastBoundary>
        <QuietSavedToast />
      </QuietSavedToastBoundary>
      <TimerVisibilityBridge />
    </div>
  );
}
