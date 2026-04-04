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
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-zinc-400 hover:text-emerald-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>
        <p className="mt-3 text-[0.65rem] font-semibold uppercase tracking-widest text-emerald-400/90">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-xl font-bold text-white">{title}</h1>
        <p className="mt-1 text-sm leading-relaxed text-zinc-400">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
