import Link from "next/link";
import type { ReactNode } from "react";

type EmptyStateWithActionProps = {
  title: string;
  description?: string;
  actionHref: string;
  actionLabel: string;
  icon?: ReactNode;
  className?: string;
};

/**
 * No dead ends — every empty list suggests the next best move.
 */
export function EmptyStateWithAction({
  title,
  description,
  actionHref,
  actionLabel,
  icon,
  className = "",
}: EmptyStateWithActionProps) {
  return (
    <div
      className={`flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-kal-border/60 bg-kal-card-muted/30 px-6 py-8 text-center ${className}`}
    >
      {icon}
      <p className="text-sm font-bold text-kal-text">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-kal-muted">
          {description}
        </p>
      )}
      <Link
        href={actionHref}
        className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-kal-accent px-5 text-sm font-semibold text-kal-accent-foreground"
      >
        {actionLabel}
      </Link>
    </div>
  );
}
