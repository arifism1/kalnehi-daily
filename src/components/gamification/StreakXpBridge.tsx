"use client";

import { useEffect, useRef } from "react";
import { recordXpEvent } from "@/actions/xp";
import type { XpEventType } from "@/lib/xpMath";

const MILESTONES: { n: number; type: XpEventType; ref: string }[] = [
  { n: 7, type: "streak_7", ref: "milestone-7" },
  { n: 30, type: "streak_30", ref: "milestone-30" },
  { n: 100, type: "streak_100", ref: "milestone-100" },
];

type StreakXpBridgeProps = { streak: number };

/**
 * Awards streak milestone XP once per milestone (server dedupes).
 */
export function StreakXpBridge({ streak }: StreakXpBridgeProps) {
  const prev = useRef(0);
  useEffect(() => {
    if (streak < 1) return;
    if (streak < prev.current) {
      prev.current = streak;
      return;
    }
    prev.current = streak;
    for (const m of MILESTONES) {
      if (streak === m.n) {
        void recordXpEvent(m.type, m.ref, ["/home"]);
      }
    }
  }, [streak]);
  return null;
}
