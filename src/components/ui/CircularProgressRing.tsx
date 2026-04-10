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
 * SVG ring with accent gradient; center content is fully custom via children.
 */
export function CircularProgressRing({
  percent,
  size = 152,
  strokeWidth = 9,
  gradientId,
  className,
  /** Light: visible on white / kal-card-muted; dark: subtle track on slate cards */
  trackClassName = "text-slate-300 dark:text-slate-500",
  children,
}: CircularProgressRingProps) {
  const p = Math.min(100, Math.max(0, percent));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const dash = (p / 100) * c;
  /** Inset scales with ring so labels stay clear of the stroke (light + dark themes). */
  const contentInset = Math.max(
    14,
    Math.round(strokeWidth * 1.35 + size * 0.06),
  );

  return (
    <div
      className={clsx("relative flex shrink-0 items-center justify-center", className)}
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
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="50%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
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
      <div
        className="pointer-events-none absolute flex flex-col items-center justify-center rounded-full px-3 py-2 text-center"
        style={{ inset: contentInset }}
      >
        {children}
      </div>
    </div>
  );
}
