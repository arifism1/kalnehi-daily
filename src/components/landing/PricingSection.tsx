import Link from "next/link";
import { Check } from "lucide-react";

const BENEFITS = [
  "Dictate My Day + Self Type planners",
  "Full syllabus with microtopics & predictions",
  "Full execution planner + timer",
  "Progress, Daily Log, Revision Engine",
  "Full habits, motivation, meditation",
  "Doubt Tracker & PrepBrain AI coach",
];

const TRUST_SIGNALS = [
  "No card for free day",
  "UPI & cards accepted",
  "Cancel anytime",
  "Works on Android, iOS, desktop",
  "Installs as an app (PWA)",
];

export function PricingSection() {
  return (
    <section className="bg-[#F2EFE8] py-24 lg:py-32" id="pricing">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        {/* Header */}
        <div className="mb-14 text-center">
          <h2
            className="mb-4 text-3xl font-normal leading-tight tracking-tight text-kal-text sm:text-4xl lg:text-[2.75rem]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            One plan. Everything included.
          </h2>
          <p className="mx-auto max-w-lg text-lg text-kal-text-secondary">
            No tiers, no feature gates, no surprise charges. Start free — no card needed.
          </p>
        </div>

        <div className="mx-auto max-w-2xl">
          {/* Trial steps */}
          <div className="mb-8 grid gap-3 sm:grid-cols-3">
            {[
              { step: "1", label: "Free day", detail: "No card. Full access." },
              { step: "2", label: "₹19 for 2 days", detail: "Paid trial. Still cheap." },
              { step: "3", label: "₹299 / month", detail: "Cancel anytime." },
            ].map(({ step, label, detail }) => (
              <div
                key={step}
                className="flex flex-col gap-1.5 rounded-2xl border border-kal-border bg-white/60 p-4 text-center"
              >
                <span className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-kal-accent text-xs font-bold text-white">
                  {step}
                </span>
                <p className="text-sm font-bold text-kal-text">{label}</p>
                <p className="text-xs text-kal-muted">{detail}</p>
              </div>
            ))}
          </div>

          {/* Main pricing card */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-kal-accent/40 bg-white p-8 shadow-[0_16px_48px_-8px_rgba(255,122,0,0.15)] ring-1 ring-kal-accent/20">
            {/* Top badge */}
            <div className="absolute -top-px left-1/2 -translate-x-1/2">
              <span className="inline-block rounded-b-2xl bg-kal-accent px-6 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-[0_4px_12px_rgba(255,122,0,0.3)]">
                Pro — Everything for serious prep
              </span>
            </div>

            <div className="mt-6 flex flex-col items-center text-center">
              {/* Price display */}
              <div className="mb-2 flex items-baseline gap-2">
                <span
                  className="text-5xl font-normal tabular-nums text-kal-text"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  ₹299
                </span>
                <span className="text-base text-kal-muted">/ month</span>
              </div>
              <p className="mb-1 text-sm text-kal-muted">
                after a{" "}
                <span className="font-semibold text-kal-text">free day</span> +{" "}
                <span className="font-semibold text-kal-text">₹19 paid trial</span>
              </p>
              <p className="text-xs text-kal-muted">
                60 voice min / month · 2 million PrepBrain AI tokens / month
              </p>
            </div>

            {/* Divider */}
            <div className="my-6 border-t border-kal-border" />

            {/* Benefits */}
            <ul className="mb-8 space-y-3">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-kal-accent"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                  <span className="text-sm leading-snug text-kal-text-secondary">{b}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <Link
              href="/auth"
              className="flex min-h-[52px] w-full items-center justify-center rounded-full bg-kal-accent text-base font-bold text-white shadow-[0_4px_16px_rgba(255,122,0,0.28)] transition hover:brightness-105 active:scale-[0.99]"
            >
              Start free — 1 day on us
            </Link>

            <p className="mt-3 text-center text-xs text-kal-muted">
              No card needed to start. Add one only when you upgrade to the paid trial.
            </p>
          </div>

          {/* Trust signals */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5">
            {TRUST_SIGNALS.map((s) => (
              <span key={s} className="flex items-center gap-1.5 text-sm text-kal-muted">
                <span className="h-1 w-1 rounded-full bg-kal-accent/60" aria-hidden />
                {s}
              </span>
            ))}
          </div>

          {/* AI quotas note */}
          <p className="mt-6 text-center text-xs text-kal-muted">
            Free day: 5 voice min + 300k AI tokens. Paid trial: 15 voice min + 500k tokens.
            Monthly: 60 voice min + 2M tokens (resets each cycle).
          </p>
        </div>
      </div>
    </section>
  );
}
