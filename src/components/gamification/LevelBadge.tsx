"use client";

import clsx from "clsx";
import { formatRankHeadline, rankTierFromXp } from "@/lib/xpMath";

type LevelBadgeProps = {
  xp: number;
  level: number;
  className?: string;
  compact?: boolean;
};

export function LevelBadge({ xp, level, className, compact }: LevelBadgeProps) {
  const { label } = rankTierFromXp(xp);
  const sub = formatRankHeadline(xp, level);
  return (
    <div
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border border-kal-accent/25 bg-kal-accent/10 px-2.5 py-1",
        className,
      )}
      title={sub}
    >
      {compact ? (
        <span className="text-[10px] font-bold uppercase tracking-wider text-kal-accent" aria-hidden>
          {label}
        </span>
      ) : (
        <span className="max-w-[14rem] truncate text-[11px] font-semibold text-kal-text">{sub}</span>
      )}
    </div>
  );
}
