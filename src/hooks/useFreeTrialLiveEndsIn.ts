"use client";

import { useEffect, useState } from "react";

import { formatWelcomeTrialEndsIn } from "@/lib/freeTrial";

/** Ticking label like "Ends in 18h 42m" while welcome trial is active. */
export function useFreeTrialLiveEndsIn(
  freeTrialEndsAtIso: string | null,
  active: boolean,
): string {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!active || !freeTrialEndsAtIso) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active, freeTrialEndsAtIso]);

  if (!active || !freeTrialEndsAtIso) return "";
  return formatWelcomeTrialEndsIn(freeTrialEndsAtIso, nowMs);
}
