"use client";

import { Capacitor } from "@capacitor/core";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { type ReactNode } from "react";

import { NativeLockoutScreen } from "@/components/subscription/NativeLockoutScreen";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";

type TrialGuardProps = {
  children: ReactNode;
};

export function TrialGuard({ children }: TrialGuardProps) {
  const { welcomeTrialExpiredNoPay, loading } = useSubscriptionAccess();
  const router = useRouter();

  const locked = welcomeTrialExpiredNoPay && !loading;
  // Android companion app: no in-app purchase — users subscribe at kalnehi.com.
  const isNativeApp = Capacitor.isNativePlatform();

  return (
    <div className="relative flex min-h-0 min-h-dvh flex-1 flex-col">
      <div
        className={clsx(
          "relative flex min-h-0 flex-1 flex-col",
          locked && "pointer-events-none",
        )}
      >
        {children}
        {locked ? (
          <>
            <div
              className="absolute inset-0 z-[80] bg-kal-page/35 backdrop-blur-[12px]"
              aria-hidden
            />
            {isNativeApp ? (
              // Android companion model: informational notice only — no checkout
              // button or Custom Tabs. Users subscribe on kalnehi.com in their
              // own browser, then return and refresh. pointer-events-auto
              // overrides the parent's pointer-events-none so the refresh button
              // is tappable.
              <div className="pointer-events-auto">
                <NativeLockoutScreen />
              </div>
            ) : (
              // Web/PWA branch: in-app upgrade route.
              <div
                className="pointer-events-none absolute inset-0 z-[81] flex items-center justify-center p-6"
                role="dialog"
                aria-modal="true"
                aria-labelledby="trial-guard-title"
                aria-describedby="trial-guard-desc"
              >
                <div className="kal-glass-panel pointer-events-auto mx-auto flex max-w-md flex-col gap-5 rounded-2xl px-8 py-10 text-center shadow-lg">
                  <h2
                    id="trial-guard-title"
                    className="font-display text-lg font-semibold leading-snug text-kal-text"
                  >
                    Your trial has ended
                  </h2>
                  <p
                    id="trial-guard-desc"
                    className="text-sm leading-relaxed text-kal-text-secondary"
                  >
                    To keep using Kalnehi — study logs, streak, and the rest of the app — subscribe
                    to the <span className="font-semibold text-kal-text">Smart Plan</span>.
                  </p>
                  <div className="mx-auto w-full max-w-xs">
                    <button
                      type="button"
                      onClick={() => router.push("/upgrade")}
                      className="kal-btn-accent min-h-[48px] w-full"
                    >
                      Upgrade to Smart Plan
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
