"use client";

import { Camera, Timer } from "lucide-react";

import { useAiGate } from "@/hooks/useAiGate";
import { useFreeTrialLiveEndsIn } from "@/hooks/useFreeTrialLiveEndsIn";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";

/**
 * Welcome-trial quota + live countdown for camera study sessions (each completed session uses one photo scan).
 */
export function StudyCameraTrialStatus() {
  const { hasPaidAccess, isWelcomeTrial, photoScansRemaining, freeTrialEndsAtIso } = useAiGate();
  const { freeTrialActive } = useSubscriptionAccess();

  const endsIn = useFreeTrialLiveEndsIn(
    freeTrialEndsAtIso,
    !hasPaidAccess && (freeTrialActive || isWelcomeTrial),
  );

  if (hasPaidAccess) return null;

  if (!freeTrialActive && !isWelcomeTrial) return null;

  return (
    <div className="rounded-2xl border border-kal-accent/25 bg-gradient-to-br from-kal-accent/8 to-kal-card-muted px-4 py-3 dark:border-kal-accent/20">
      <div className="flex flex-wrap items-center gap-2 text-xs text-kal-text-secondary">
        <Camera className="h-3.5 w-3.5 shrink-0 text-kal-accent" aria-hidden />
        <span className="font-medium text-kal-text">
          {photoScansRemaining} camera session{photoScansRemaining === 1 ? "" : "s"} left on your
          welcome trial
        </span>
      </div>
      {endsIn ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-[0.65rem] font-semibold tabular-nums text-kal-accent sm:text-xs">
          <Timer className="h-3 w-3 shrink-0" aria-hidden />
          {endsIn}
        </p>
      ) : null}
      <p className="mt-2 text-[11px] leading-relaxed text-kal-text-secondary">
        Each saved camera session counts as one photo scan — same pool as handwritten scan. Voice
        time is tracked separately on Dictate.
      </p>
    </div>
  );
}
