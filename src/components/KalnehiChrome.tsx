"use client";

import clsx from "clsx";
import { Menu } from "lucide-react";
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
import { ProfileSheet } from "@/components/ProfileSheet";
import { QuietSavedToast } from "@/components/QuietSavedToast";
import { SyncStatusBanner } from "@/components/SyncStatusBanner";
import { UndoToast } from "@/components/ui/UndoToast";
import { TimerVisibilityBridge } from "@/components/task/TimerVisibilityBridge";
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
  const userId = useAuthStore((s) => s.user?.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const onboarding = pathname === "/onboarding";

  useEffect(() => {
    console.log("[KalnehiChrome] mounted", { path: pathname });
  }, [pathname]);

  return (
    <div className="flex min-h-full min-h-dvh flex-col bg-kal-page text-kal-text">
      <div className="flex min-w-0 flex-1 flex-col">
        {!onboarding && (
          <header className="sticky top-0 z-40 border-b border-kal-border bg-kal-card kal-nav-shadow">
            <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:h-[3.5rem] sm:px-6 xl:px-8">
              <Link
                href="/"
                className="flex min-w-0 items-center gap-3 rounded-xl py-1 outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-kal-accent/40"
                aria-label="Dashboard"
              >
                <Image
                  src="/icon-192x192.png"
                  alt=""
                  width={36}
                  height={36}
                  className="h-8 w-8 shrink-0 rounded-xl ring-1 ring-kal-border"
                />
                <span className="text-lg font-semibold tracking-tight text-black dark:text-white">
                  kalnehi
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-transparent text-kal-text-secondary transition-colors hover:border-kal-border hover:bg-kal-card-muted active:scale-[0.98] dark:hover:bg-kal-card-muted"
                aria-expanded={menuOpen}
                aria-label="Open navigation menu"
              >
                <Menu className="h-6 w-6" strokeWidth={2} />
              </button>
            </div>
          </header>
        )}

        <main
          className={clsx(
            "mx-auto w-full flex-1 px-4 py-6 sm:px-6 sm:py-8",
            "max-w-lg md:max-w-5xl lg:max-w-6xl xl:max-w-7xl 2xl:max-w-[90rem]",
            "md:px-8 xl:px-10 xl:py-10 2xl:px-12",
            "pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom))]",
          )}
        >
          {!onboarding && <SyncStatusBanner />}
          {children}
        </main>
      </div>

      <MainNavigationMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenAccount={
          userId
            ? () => {
                setMenuOpen(false);
                setProfileOpen(true);
              }
            : undefined
        }
        pasteHandwrittenHref={userId ? "/paste-handwritten" : undefined}
      />
      <ProfileSheet open={profileOpen} onClose={() => setProfileOpen(false)} />
      <UndoToast />
      <QuietSavedToastBoundary>
        <QuietSavedToast />
      </QuietSavedToastBoundary>
      <TimerVisibilityBridge />
    </div>
  );
}
