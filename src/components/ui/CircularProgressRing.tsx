"use client";

import clsx from "clsx";
import { useEffect, useState, type ReactNode } from "react";

type CircularProgressRingProps = {
  /** 0–100 */
  percent: number;
  size?: number;
  strokeWidth?: number;
  /** Unique id for SVG gradient */
  gradientId: string;
  className?: string;
  trackClassName?: string;
  /** Applied to the progress arc (e.g. longer transition). */
  progressClassName?: string;
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
  progressClassName = "transition-[stroke-dasharray] duration-500 ease-out motion-reduce:transition-none",
  children,
}: CircularProgressRingProps) {
  const p = Math.min(100, Math.max(0, percent));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;

  // Animate from 0 on first mount — the CSS transition handles the sweep.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const dash = mounted ? (p / 100) * c : 0;
  /** Inset scales with ring so labels stay clear of the stroke (light + dark themes). */
  const contentInset = Math.max(
    14,
    Math.round(strokeWidth * 1.35 + size * 0.06),
  );

  return (
    <div
      className={clsx(
        "relative flex shrink-0 items-center justify-center",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
        aria-hidden
      >
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFCB99" />
              <stop offset="50%" stopColor="#FF7A00" />
              <stop offset="100%" stopColor="#B35200" />
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
            className={progressClassName}
          />
        </svg>
      </div>
      <div
        className="pointer-events-none absolute z-10 flex flex-col items-center justify-center rounded-full px-3 py-2 text-center"
        style={{ inset: contentInset }}
      >
        {children}
      </div>
    </div>
  );
}
