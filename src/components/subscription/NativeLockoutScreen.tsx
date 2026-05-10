"use client";

import { useRouter } from "next/navigation";

/**
 * Shown when in-app checkout is unavailable (e.g. embedded shell) after the welcome trial ended.
 * Matches TrialGuard messaging; primary path is web billing at `/upgrade`.
 */
export function NativeLockoutScreen() {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-kal-page p-6">
      <div className="kal-glass-panel mx-auto flex max-w-md flex-col gap-5 rounded-2xl px-8 py-10 text-center shadow-lg">
        <h2 className="font-display text-lg font-semibold leading-snug text-kal-text">
          Your trial has ended
        </h2>
        <p className="text-sm leading-relaxed text-kal-text-secondary">
          To keep using Kalnehi, subscribe to the{" "}
          <span className="font-semibold text-kal-text">Smart Plan</span>. Open checkout on the web,
          then return here.
        </p>
        <div className="flex w-full max-w-xs flex-col gap-2">
          <button
            type="button"
            onClick={() => router.push("/upgrade")}
            className="kal-btn-accent min-h-[48px] w-full"
          >
            Upgrade to Smart Plan
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="kal-glass-subtle min-h-[44px] w-full rounded-xl px-4 py-3 text-sm font-semibold text-kal-text"
          >
            Refresh status
          </button>
        </div>
      </div>
    </div>
  );
}
