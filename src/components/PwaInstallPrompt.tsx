"use client";

import { Download, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_DISMISS_UNTIL = "kalnehi-pwa-dismiss-until";
const STORAGE_VISIT_COUNT = "kalnehi-pwa-visits";
const STORAGE_ENGAGED = "kalnehi-pwa-engaged";

function isStandalone(): boolean {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

/** True when Chrome/Android can fire `beforeinstallprompt` (not iOS Safari). */
function mightSupportNativeInstall(): boolean {
  if (typeof window === "undefined") return false;
  return "BeforeInstallPromptEvent" in window || /Android/i.test(navigator.userAgent);
}

export function PwaInstallPrompt() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const deferred = useRef<{
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: string }>;
  } | null>(null);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("kalnehi-route-count");
      const n = raw ? parseInt(raw, 10) : 0;
      sessionStorage.setItem("kalnehi-route-count", String(n + 1));
    } catch {
      /* ignore */
    }
  }, [pathname]);

  const dismissForDays = useCallback((days: number) => {
    const until = Date.now() + days * 24 * 60 * 60 * 1000;
    try {
      localStorage.setItem(STORAGE_DISMISS_UNTIL, String(until));
    } catch {
      /* ignore */
    }
    setVisible(false);
  }, []);

  const tryShow = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!isMobileViewport()) return;
    if (isStandalone()) return;

    let dismissUntil = 0;
    try {
      dismissUntil = parseInt(localStorage.getItem(STORAGE_DISMISS_UNTIL) ?? "0", 10);
    } catch {
      /* ignore */
    }
    if (dismissUntil > Date.now()) return;

    let visits = 0;
    try {
      visits = parseInt(localStorage.getItem(STORAGE_VISIT_COUNT) ?? "0", 10);
    } catch {
      /* ignore */
    }

    let routeCount = 0;
    try {
      routeCount = parseInt(sessionStorage.getItem("kalnehi-route-count") ?? "0", 10);
    } catch {
      /* ignore */
    }

    let engaged = false;
    try {
      engaged = localStorage.getItem(STORAGE_ENGAGED) === "1";
    } catch {
      /* ignore */
    }

    const firstVisit = visits <= 1;
    const afterEngagement = engaged || routeCount >= 3;

    if (!firstVisit && !afterEngagement) return;

    if (mightSupportNativeInstall() && deferred.current) {
      setIosHint(false);
      setVisible(true);
      return;
    }

    if (/iPhone|iPad|iPod/i.test(navigator.userAgent) && !mightSupportNativeInstall()) {
      setIosHint(true);
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;

    try {
      const v = parseInt(localStorage.getItem(STORAGE_VISIT_COUNT) ?? "0", 10);
      localStorage.setItem(STORAGE_VISIT_COUNT, String(v + 1));
    } catch {
      /* ignore */
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferred.current = e as unknown as typeof deferred.current;
      window.setTimeout(tryShow, 800);
    };

    const onPointerUp = () => {
      try {
        localStorage.setItem(STORAGE_ENGAGED, "1");
      } catch {
        /* ignore */
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("pointerup", onPointerUp, { passive: true });

    const t1 = window.setTimeout(tryShow, 12000);
    const t2 = window.setTimeout(tryShow, 35000);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("pointerup", onPointerUp);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [tryShow]);

  useEffect(() => {
    const id = window.setTimeout(tryShow, 600);
    return () => window.clearTimeout(id);
  }, [pathname, tryShow]);

  const onInstall = async () => {
    const d = deferred.current;
    if (!d) {
      dismissForDays(14);
      return;
    }
    try {
      await d.prompt();
      await d.userChoice;
    } catch {
      /* ignore */
    }
    deferred.current = null;
    dismissForDays(120);
  };

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
      role="region"
      aria-label="Install app"
    >
      <div className="pointer-events-auto flex max-w-md flex-col gap-2 rounded-2xl border border-kal-border bg-kal-card/95 px-4 py-3 shadow-kal-card backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-kal-accent-soft text-kal-accent">
            <Download className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-kal-text">Install Kalnehi Daily</p>
            <p className="mt-0.5 text-xs leading-snug text-kal-text-secondary">
              {iosHint ? (
                <>
                  On iPhone: tap <span className="font-medium">Share</span>, then{" "}
                  <span className="font-medium">Add to Home Screen</span> for a full-screen app
                  experience.
                </>
              ) : (
                <>
                  Add to your home screen for faster load, offline support, and a distraction-free
                  study shell — optimized for JEE, NEET & Boards prep.
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-kal-muted hover:bg-kal-card-muted hover:text-kal-text"
            aria-label="Dismiss install prompt"
            onClick={() => dismissForDays(7)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {!iosHint && deferred.current && (
          <button
            type="button"
            onClick={onInstall}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-kal-accent px-4 text-sm font-bold text-kal-accent-foreground"
          >
            <Download className="h-4 w-4" aria-hidden />
            Install app
          </button>
        )}
      </div>
    </div>
  );
}
