import Link from "next/link";

import { SMART_PLAN_MONTHLY_DISPLAY } from "@/lib/smartPlanPricing";

interface CTABannerProps {
  headline?: string;
  subtext?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

export function CTABanner({
  headline = "Start free — 3 days on us",
  subtext = `No credit card. Full access for 3 days. Then ${SMART_PLAN_MONTHLY_DISPLAY}/month — or save 10–25% with 6-month or annual plans.`,
  primaryLabel = "Start free — 3 days on us",
  primaryHref = "/auth",
  secondaryLabel = "See pricing",
  secondaryHref = "/pricing",
}: CTABannerProps) {
  return (
    <section
      className="rounded-3xl bg-kal-accent/8 border border-kal-accent/20 px-6 py-10 text-center sm:px-10 sm:py-14"
      aria-label="Get started with Kalnehi Daily"
    >
      <h2 className="text-xl font-bold text-kal-text sm:text-2xl">{headline}</h2>
      <p className="mt-2 text-sm text-kal-text-secondary">{subtext}</p>
      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href={primaryHref}
          className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-kal-accent px-8 text-sm font-bold text-white shadow-[0_4px_16px_rgba(255,122,0,0.28)] transition hover:brightness-105 active:scale-[0.99]"
        >
          {primaryLabel}
        </Link>
        <Link
          href={secondaryHref}
          className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-kal-border px-8 text-sm font-semibold text-kal-text transition hover:border-kal-accent/40 hover:text-kal-accent-dark"
        >
          {secondaryLabel}
        </Link>
      </div>
      <p className="mt-4 text-xs text-kal-muted">Win Daily.</p>
    </section>
  );
}
