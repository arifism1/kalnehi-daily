"use client";

import clsx from "clsx";
import type { ReactNode } from "react";

type SettingsSectionGroupProps = {
  id: string;
  title: string;
  className?: string;
  children: ReactNode;
};

export function SettingsSectionGroup({
  id,
  title,
  className,
  children,
}: SettingsSectionGroupProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={clsx("scroll-mt-24 space-y-3", className)}
    >
      <h2
        id={`${id}-heading`}
        className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}
