"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type PlannerPageShellProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export function PlannerPageShell({
  eyebrow,
  title,
  subtitle,
  children,
}: PlannerPageShellProps) {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-kal-muted transition-colors hover:text-kal-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>
        <p className="mt-4 text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
          {eyebrow}
        </p>
        <h1 className="kal-feature-title mt-1">{title}</h1>
        <p className="kal-feature-lead mt-2 max-w-2xl">
          {subtitle}
        </p>
      </div>
      {children}
    </div>
  );
}
