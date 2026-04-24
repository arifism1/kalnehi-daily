"use client";

import { motion, useReducedMotion } from "framer-motion";
import clsx from "clsx";

type StreakFlameProps = {
  streak: number;
  className?: string;
};

function flameScale(streak: number): number {
  if (streak <= 0) return 0.75;
  if (streak <= 7) return 0.9 + (streak / 7) * 0.2;
  if (streak <= 14) return 1.1 + ((streak - 7) / 7) * 0.15;
  return 1.25 + Math.min(0.2, (streak - 14) / 30);
}

/**
 * Streak display with a flame that grows with consecutive days.
 */
export function StreakFlame({ streak, className = "" }: StreakFlameProps) {
  const reduce = useReducedMotion();
  const s = flameScale(streak);
  return (
    <span className={clsx("inline-flex items-end gap-1.5", className)} title={`${streak}-day streak`}>
      <motion.span
        className="inline-block text-amber-500 drop-shadow-sm dark:text-amber-400"
        style={{ lineHeight: 1 }}
        initial={false}
        animate={{ scale: s, y: reduce ? 0 : [0, -2, 0] }}
        transition={
          reduce
            ? { type: "spring", stiffness: 200, damping: 18 }
            : {
                scale: { type: "spring", stiffness: 200, damping: 18 },
                y: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
              }
        }
        aria-hidden
      >
        <svg
          viewBox="0 0 24 32"
          className="h-6 w-5 sm:h-7 sm:w-6"
          fill="currentColor"
        >
          <path d="M12 2c-1 3-4.5 5-5.5 9.5C5 16 6.5 20 12 24c5.5-4 7-8 5.5-12.5C16.5 7 13 5 12 2z" />
        </svg>
      </motion.span>
      <span className="tabular-nums text-sm font-bold text-kal-text">{streak}</span>
    </span>
  );
}
