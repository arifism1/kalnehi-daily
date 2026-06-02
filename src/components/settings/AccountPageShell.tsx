"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type AccountPageShellProps = {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  lead: string;
  /** Optional jump nav rendered below the header (e.g. section chips on sm+). */
  jumpNav?: React.ReactNode;
  /** Cross-link to the sibling account page (Profile ↔ Settings). */
  secondaryLink?: { href: string; label: string };
};

export function AccountPageShell({
  children,
  eyebrow,
  title,
  lead,
  jumpNav,
  secondaryLink,
}: AccountPageShellProps) {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-kal-text-secondary transition-colors hover:text-kal-accent"
        >
          <ArrowLeft className="size-4" />
          Home
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
              {eyebrow}
            </p>
            <h1 className="kal-feature-title mt-1">{title}</h1>
            <p className="kal-feature-lead mt-2 max-w-2xl">{lead}</p>
          </div>
          {secondaryLink ? (
            <Link
              href={secondaryLink.href}
              className="shrink-0 text-sm font-semibold text-kal-accent transition-colors hover:text-kal-accent/80"
            >
              {secondaryLink.label} →
            </Link>
          ) : null}
        </div>
        {jumpNav ? <div className="mt-4">{jumpNav}</div> : null}
      </div>
      {children}
    </div>
  );
}
