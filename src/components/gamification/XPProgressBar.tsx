"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";
import { levelFromTotalXp } from "@/lib/xpMath";

type XPProgressBarProps = {
  totalXp: number;
  className?: string;
};

const XP_PER_SEGMENT = 100;

export function XPProgressBar({ totalXp, className = "" }: XPProgressBarProps) {
  const reduce = useReducedMotion();
  const { within, pct } = useMemo(() => {
    const inSeg = totalXp % XP_PER_SEGMENT;
    return { within: inSeg, pct: inSeg / XP_PER_SEGMENT };
  }, [totalXp]);
  const nextLevel = levelFromTotalXp(totalXp);
  return (
    <div className={className}>
      <div className="mb-0.5 flex items-center justify-between text-[10px] font-medium text-kal-muted">
        <span>XP progress</span>
        <span className="tabular-nums text-kal-text-secondary">
          {within}/{XP_PER_SEGMENT} to L{nextLevel + 1}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-kal-border/40">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-kal-accent"
          initial={reduce ? { width: `${pct * 100}%` } : { width: 0 }}
          animate={{ width: `${pct * 100}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 28 }}
        />
      </div>
    </div>
  );
}
