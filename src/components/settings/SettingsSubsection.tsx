"use client";

import clsx from "clsx";
import type { ReactNode } from "react";

type SettingsSubsectionProps = {
  title: string;
  kicker?: string;
  description?: string;
  className?: string;
  children: ReactNode;
};

export function SettingsSubsection({
  title,
  kicker,
  description,
  className,
  children,
}: SettingsSubsectionProps) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-kal-border/50 bg-kal-card-muted/40 p-3 sm:p-4",
        className,
      )}
    >
      {kicker ? (
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-kal-accent">
          {kicker}
        </p>
      ) : null}
      <p
        className={clsx(
          "text-sm font-semibold text-kal-text",
          kicker ? "mt-0.5" : "",
        )}
      >
        {title}
      </p>
      {description ? (
        <p className="mt-0.5 text-xs leading-relaxed text-kal-text-secondary">
          {description}
        </p>
      ) : null}
      <div className="mt-3">{children}</div>
    </div>
  );
}
