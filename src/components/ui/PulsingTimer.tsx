"use client";

import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode, useEffect, useState } from "react";

type PulsingTimerProps = {
  children: ReactNode;
  /** When true, timer is actively counting (pulses each second) */
  active: boolean;
  className?: string;
};

/**
 * Wraps a timer display; pulses like a heartbeat when the session is running.
 */
export function PulsingTimer({ children, active, className = "" }: PulsingTimerProps) {
  const reduce = useReducedMotion();
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    if (!active || reduce) return;
    const id = window.setInterval(() => setBeat((b) => b + 1), 1000);
    return () => window.clearInterval(id);
  }, [active, reduce]);

  if (reduce || !active) {
    return <span className={className}>{children}</span>;
  }

  return (
    <motion.span
      className={className}
      key={beat}
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.04, 1] }}
      transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.span>
  );
}
