"use client";

import { motion } from "framer-motion";

type AnimatedCheckmarkProps = {
  className?: string;
  size?: number;
  strokeWidth?: number;
  /** 0-1, animates in when set */
  show?: boolean;
};

/**
 * Path-drawn checkmark for satisfying task completion feedback.
 */
export function AnimatedCheckmark({
  className = "",
  size = 24,
  strokeWidth = 2.5,
  show = true,
}: AnimatedCheckmarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
    >
      <motion.path
        d="M5 12.5l4.5 4.5L19 6"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0.4 }}
        animate={
          show
            ? { pathLength: 1, opacity: 1 }
            : { pathLength: 0, opacity: 0.4 }
        }
        transition={{ pathLength: { type: "spring", stiffness: 300, damping: 28 } }}
      />
    </svg>
  );
}
