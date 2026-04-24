"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type TapBounceProps = {
  children: ReactNode;
  className?: string;
  /** Slightly smaller tap feedback for dense UIs */
  compact?: boolean;
};

/**
 * Cards and primary CTAs get subtle press feedback.
 */
export function TapBounce({ children, className = "", compact }: TapBounceProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      className={className}
      whileTap={{ scale: compact ? 0.98 : 0.96 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      {children}
    </motion.div>
  );
}
