"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { type ReactNode } from "react";

import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";

type TrialGuardProps = {
  children: ReactNode;
};

export function TrialGuard({ children }: TrialGuardProps) {
  const { welcomeTrialExpiredNoPay, loading } = useSubscriptionAccess();
  const router = useRouter();

  const locked = welcomeTrialExpiredNoPay && !loading;

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
                  Initial Calibration Complete
                </h2>
                <p id="trial-guard-desc" className="text-sm leading-relaxed text-kal-text">
                  Your 72-hour voice and syllabus calibration phase has concluded. To keep your
                  study logs synced and maintain your daily preparation streak, please update your
                  access status.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/upgrade")}
                  className="kal-btn-accent min-h-[48px] w-full max-w-xs"
                >
                  Manage Account Status
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
