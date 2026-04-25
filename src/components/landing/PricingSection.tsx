import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

const PLANS = [
  {
    name: "3-Day Free Trial",
    price: "₹0",
    duration: "3 days",
    highlight: false,
    features: [
      "Every feature fully unlocked",
      "Daily planner + syllabus tracker",
      "Marks engine + rank prediction",
      "Mastermind — 60,000 tokens",
      "Voice control — 5 minutes",
    ],
    cta: "Start free — no card",
    ctaHref: "/auth",
    ctaClass:
      "border border-kal-border bg-kal-card text-kal-text hover:border-kal-accent/40 hover:text-kal-accent",
  },
  {
    name: "Smart Plan",
    price: "₹399",
    duration: "/month",
    highlight: true,
    features: [
      "Everything in the free trial, every month",
      "Marks engine + rank prediction",
      "Revision reminders",
      "Mastermind — 20,00,000 tokens/month",
      "Voice control — 100 minutes/month",
    ],
    cta: "Subscribe — ₹399/month",
    ctaHref: "/pricing",
    ctaClass:
      "bg-kal-accent text-white shadow-[0_4px_16px_rgba(255,122,0,0.28)] hover:brightness-105",
  },
] as const;

export function PricingSection() {
  return (
    <section id="pricing" className="bg-kal-page-end py-24 lg:py-32">
      <div className="mx-auto max-w-5xl px-6 sm:px-8 lg:px-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <h2
            className="text-3xl font-normal leading-tight tracking-tight text-kal-text sm:text-4xl lg:text-[2.75rem]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Most students plan.
            <br />
            <span className="text-kal-accent">Toppers have a system.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-kal-text-secondary">
            Start free for 3 days. Upgrade to Smart Plan to keep going.
          </p>
          <p className="mt-2 text-sm text-kal-muted">Two simple options. One direction.</p>
        </div>

        {/* Plan cards */}
        <div className="mx-auto grid max-w-2xl gap-5 sm:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border-2 p-6 transition-shadow hover:shadow-[var(--kal-shadow-card-hover)] ${
                plan.highlight
                  ? "border-kal-accent/60 bg-gradient-to-b from-kal-accent/8 to-kal-bg-elevated shadow-[0_8px_32px_rgba(255,122,0,0.14)]"
                  : "border-kal-border bg-kal-bg-elevated"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2">
                  <span className="inline-block rounded-b-xl bg-kal-accent px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-[0_4px_12px_rgba(255,122,0,0.3)]">
                    Most popular
                  </span>
                </div>
              )}

              <div className={plan.highlight ? "mt-3" : ""}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-kal-muted">
                  {plan.name}
                </p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span
                    className="text-4xl font-normal text-kal-text"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {plan.price}
                  </span>
                  <span className="text-sm text-kal-muted">{plan.duration}</span>
                </div>
              </div>

              <ul className="mt-5 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-kal-accent"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                    <span className="text-sm text-kal-text-secondary">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={plan.ctaHref}
                className={`mt-6 inline-flex min-h-[48px] items-center justify-center rounded-full px-5 text-sm font-bold transition ${plan.ctaClass}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* View full comparison link */}
        <div className="mt-8 flex justify-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-full border border-kal-border bg-transparent px-5 py-2.5 text-sm font-semibold text-kal-text-secondary transition hover:border-kal-accent/40 hover:text-kal-accent"
          >
            View full comparison
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        {/* Trust signals */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {[
            "No card for free trial",
            "UPI & cards accepted",
            "Cancel anytime",
            "Works on Android, iOS, desktop",
            "Installs as a PWA",
          ].map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-xs text-kal-muted">
              <span className="h-1 w-1 rounded-full bg-kal-accent/50" aria-hidden />
              {s}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
