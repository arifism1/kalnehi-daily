import Link from "next/link";

import { SMART_PLAN_MONTHLY_DISPLAY } from "@/lib/smartPlanPricing";

export function FinalCTASection() {
  return (
    <section className="bg-kal-page-end py-24 lg:py-32">
      <div className="mx-auto max-w-4xl px-6 text-center sm:px-8 lg:px-12">
        <h2
          className="mb-8 text-4xl font-normal leading-[1.05] tracking-tight text-kal-text sm:text-5xl lg:text-6xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Start free — no card needed.
        </h2>

        <div className="flex flex-col items-center gap-4">
          <Link
            href="/auth"
            className="inline-flex min-h-[56px] items-center justify-center rounded-full bg-kal-accent px-10 text-base font-bold text-white shadow-[0_4px_24px_rgba(255,122,0,0.35)] transition hover:brightness-105 active:scale-[0.99]"
          >
            Try Kalnehi Daily for free
          </Link>
          <p className="text-sm text-kal-muted">
            7 days fully free · No card needed · Then {SMART_PLAN_MONTHLY_DISPLAY}/month · Cancel anytime.
          </p>
        </div>
      </div>
    </section>
  );
}
