"use client";

import clsx from "clsx";
import type { ReactNode } from "react";

type CircularProgressRingProps = {
  /** 0–100 */
  percent: number;
  size?: number;
  strokeWidth?: number;
  /** Unique id for SVG gradient */
  gradientId: string;
  className?: string;
  trackClassName?: string;
  children: ReactNode;
};

/**
 * SVG ring with emerald gradient; center content is fully custom via children.
 */
export function CircularProgressRing({
  percent,
  size = 152,
  strokeWidth = 9,
  gradientId,
  className,
  trackClassName = "text-white/[0.08]",
  children,
}: CircularProgressRingProps) {
  const p = Math.min(100, Math.max(0, percent));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const dash = (p / 100) * c;

  return (
    <div
      className={clsx("relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient
            id={gradientId}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className={trackClassName}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          className="transition-[stroke-dasharray] duration-500 ease-out"
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
        {children}
      </div>
    </div>
  );
}
