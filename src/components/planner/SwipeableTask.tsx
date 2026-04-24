"use client";

import clsx from "clsx";
import { motion, PanInfo, useMotionValue, useTransform } from "framer-motion";
import type { ReactNode } from "react";

type SwipeableTaskProps = {
  children: ReactNode;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  disabled?: boolean;
  className?: string;
};

const TH = 72;

/**
 * Swipe right = complete, swipe left = reschedule (caller hooks these).
 */
export function SwipeableTask({
  children,
  onSwipeRight,
  onSwipeLeft,
  disabled,
  className = "",
}: SwipeableTaskProps) {
  const x = useMotionValue(0);
  const bgR = useTransform(x, [0, TH], [0, 0.22]);
  const bgL = useTransform(x, [-TH, 0], [0.18, 0]);

  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={clsx("relative overflow-hidden rounded-2xl", className)}>
      <motion.div
        className="pointer-events-none absolute inset-0 flex items-center justify-start bg-emerald-500/0 px-3 text-xs font-bold text-white"
        style={{ opacity: bgR }}
        aria-hidden
      >
        Done
      </motion.div>
      <motion.div
        className="pointer-events-none absolute inset-0 flex items-center justify-end bg-amber-500/0 px-3 text-xs font-bold text-white"
        style={{ opacity: bgL }}
        aria-hidden
      >
        Move
      </motion.div>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.12}
        style={{ x }}
        onDragEnd={(_: unknown, info: PanInfo) => {
          if (info.offset.x > TH) onSwipeRight?.();
          if (info.offset.x < -TH) onSwipeLeft?.();
          x.set(0);
        }}
        className="touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}
