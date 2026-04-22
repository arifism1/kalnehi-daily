import Link from "next/link";
import { Check, Minus } from "lucide-react";

import { AutopaySlider } from "./AutopaySlider";
import { PathFlowchart } from "./PathFlowchart";
import { PricingFAQ } from "./PricingFAQ";
import { PricingTableMobile } from "./PricingTableMobile";

/* ─────────────────────────────── Data ─────────────────────────────── */

type FeatureValue = boolean | string | null;

const FEATURES: { name: string; basic: FeatureValue; trial: FeatureValue; smart: FeatureValue }[] =
  [
    { name: "Daily planner", basic: true, trial: true, smart: true },
    { name: "Syllabus tracker", basic: true, trial: true, smart: true },
    { name: "Focus timer + study camera", basic: true, trial: true, smart: true },
    { name: "Streak + consistency heatmap", basic: true, trial: true, smart: true },
    { name: "Doubt tracker", basic: true, trial: true, smart: true },
    { name: "Marks engine + rank prediction", basic: false, trial: true, smart: true },
    { name: "Spaced revision engine", basic: false, trial: true, smart: true },
    { name: "Daily log & prep insights", basic: false, trial: true, smart: true },
    { name: "PrepBrain AI coach", basic: false, trial: true, smart: true },
    { name: "Voice control", basic: null, trial: "15 min", smart: "60 min" },
    { name: "PrepBrain tokens", basic: null, trial: "5,00,000", smart: "20,00,000/mo" },
  ];

/* ─────────────────────────────── Helpers ───────────────────────────── */

function FeatureCell({ value }: { value: FeatureValue }) {
  if (value === true)
    return (
      <span className="flex justify-center">
        <Check
          className="h-5 w-5 text-emerald-500 dark:text-emerald-400"
          strokeWidth={2.5}
          aria-label="Included"
        />
      </span>
    );
  if (value === false || value === null)
    return (
      <span className="flex justify-center">
        <Minus className="h-4 w-4 text-kal-muted/50" strokeWidth={2} aria-label="Not included" />
      </span>
    );
  return (
    <span className="block text-center text-xs font-semibold tabular-nums text-kal-text">
      {value}
    </span>
  );
}

/* ────────────────────────────── Sections ───────────────────────────── */

function HeroSection() {
  return (
    <section className="relative overflow-hidden pb-16 pt-12 sm:pb-20 sm:pt-16 lg:pb-24 lg:pt-20">
      {/* Background atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 0%, var(--kal-landing-hero-radial) 0%, transparent 65%)",
        }}
      />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        {/* Eyebrow */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-kal-accent/30 bg-kal-accent-soft px-4 py-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-kal-accent" aria-hidden />
          <span className="text-xs font-bold uppercase tracking-widest text-kal-accent-dark dark:text-kal-accent">
            Kalnehi Daily
          </span>
        </div>

        {/* Main headline */}
        <h1
          className="text-4xl font-normal leading-[1.1] tracking-tight text-kal-text sm:text-5xl lg:text-6xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Most students plan.
          <br />
          <span className="text-kal-accent">Toppers have a system.</span>
        </h1>

        {/* Sub-headline */}
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-kal-text-secondary sm:text-xl">
          Start free. Upgrade when the AI shows you what you&apos;ve been missing.
        </p>

        {/* Tagline */}
        <p className="mt-3 text-sm font-medium text-kal-muted">Three plans. One direction.</p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/auth"
            className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-kal-accent px-8 text-base font-bold text-white shadow-[0_4px_16px_rgba(255,122,0,0.32)] transition hover:brightness-105 active:scale-[0.98] sm:w-auto"
          >
            Start 3-Day Free Basic Plan
          </Link>
          <a
            href="#pricing-table"
            className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full border border-kal-border bg-kal-card/70 px-8 text-base font-semibold text-kal-text backdrop-blur-sm transition hover:border-kal-accent/40 hover:text-kal-accent sm:w-auto"
          >
            See all plans ↓
          </a>
        </div>

        {/* Trust signals */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {[
            "No card for Basic",
            "UPI & cards accepted",
            "Cancel anytime",
            "Works on Android, iOS, desktop",
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

function PricingTableSection() {
  return (
    <section id="pricing-table" className="py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        {/* Section header */}
        <div className="mb-10 text-center">
          <h2
            className="text-2xl font-normal tracking-tight text-kal-text sm:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Compare plans
          </h2>
          <p className="mt-2 text-sm text-kal-muted">Pick what fits now. Switch anytime.</p>
        </div>

        {/* Mobile: tab switcher (hidden on md+) */}
        <div className="md:hidden">
          <PricingTableMobile />
        </div>

        {/* Desktop: full comparison table (hidden below md) */}
        <div className="hidden md:block">
        {/* Table wrapper */}
        <div className="overflow-x-auto rounded-2xl border border-kal-border shadow-[var(--kal-shadow-card)]">
          <table className="w-full min-w-[560px] border-collapse">
            {/* ── Plan header row ── */}
            <thead>
              <tr>
                {/* Feature label column */}
                <th className="w-[38%] bg-kal-card/80 px-4 py-5 text-left sm:px-6">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-kal-muted">
                    Feature
                  </span>
                </th>

                {/* Basic */}
                <th className="w-[20%] bg-kal-card/80 px-3 py-5 text-center align-top">
                  <p className="text-xs font-bold uppercase tracking-wider text-kal-text-secondary">
                    Basic
                  </p>
                  <p
                    className="mt-1 text-2xl font-normal text-kal-text"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    ₹0
                  </p>
                  <p className="text-xs text-kal-muted">3 days</p>
                  <Link
                    href="/auth"
                    className="mt-3 inline-flex min-h-[36px] items-center justify-center rounded-full border border-kal-border bg-kal-card px-3 text-xs font-semibold text-kal-text transition hover:border-kal-accent/40 hover:text-kal-accent"
                  >
                    Start free
                  </Link>
                </th>

                {/* Smart Trial */}
                <th className="w-[20%] bg-kal-card/80 px-3 py-5 text-center align-top">
                  <p className="text-xs font-bold uppercase tracking-wider text-kal-text-secondary">
                    Smart Trial
                  </p>
                  <p
                    className="mt-1 text-2xl font-normal text-kal-text"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    ₹19
                  </p>
                  <p className="text-xs text-kal-muted">3 days</p>
                  <Link
                    href="/auth"
                    className="mt-3 inline-flex min-h-[36px] items-center justify-center rounded-full border border-kal-border bg-kal-card px-3 text-xs font-semibold text-kal-text transition hover:border-kal-accent/40 hover:text-kal-accent"
                  >
                    Start trial
                  </Link>
                </th>

                {/* Smart Plan — highlighted */}
                <th className="w-[22%] bg-gradient-to-b from-kal-accent/10 to-kal-card/90 px-3 py-5 text-center align-top ring-2 ring-inset ring-kal-accent/50">
                  <span className="inline-block rounded-full bg-kal-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                    Most popular
                  </span>
                  <p className="mt-2 text-xs font-bold uppercase tracking-wider text-kal-accent">
                    Smart Plan
                  </p>
                  <div className="mt-1 flex items-baseline justify-center gap-0.5">
                    <p
                      className="text-2xl font-normal text-kal-text"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      ₹499
                    </p>
                    <span className="text-xs text-kal-muted">/mo</span>
                  </div>
                  <Link
                    href="/pricing"
                    className="mt-3 inline-flex min-h-[36px] items-center justify-center rounded-full bg-kal-accent px-4 text-xs font-bold text-white shadow-[0_4px_12px_rgba(255,122,0,0.3)] transition hover:brightness-105"
                  >
                    Choose plan
                  </Link>
                </th>
              </tr>
            </thead>

            {/* ── Feature rows ── */}
            <tbody>
              {FEATURES.map(({ name, basic, trial, smart }, i) => (
                <tr
                  key={name}
                  className={i % 2 === 0 ? "bg-kal-card/30" : "bg-transparent"}
                >
                  <td className="px-4 py-3.5 text-sm font-medium text-kal-text-secondary sm:px-6">
                    {name}
                  </td>
                  <td className="px-3 py-3.5">
                    <FeatureCell value={basic} />
                  </td>
                  <td className="px-3 py-3.5">
                    <FeatureCell value={trial} />
                  </td>
                  <td className="bg-kal-accent/[0.04] px-3 py-3.5 ring-2 ring-inset ring-kal-accent/30">
                    <FeatureCell value={smart} />
                  </td>
                </tr>
              ))}
            </tbody>

            {/* ── CTA footer row ── */}
            <tfoot>
              <tr className="border-t border-kal-border">
                <td className="px-4 py-4 sm:px-6" />
                <td className="px-3 py-4 text-center">
                  <Link
                    href="/auth"
                    className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-kal-border px-4 text-sm font-semibold text-kal-text-secondary transition hover:border-kal-accent/40 hover:text-kal-accent"
                  >
                    Start Free
                  </Link>
                </td>
                <td className="px-3 py-4 text-center">
                  <Link
                    href="/auth"
                    className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-kal-border px-4 text-sm font-semibold text-kal-text-secondary transition hover:border-kal-accent/40 hover:text-kal-accent"
                  >
                    Start Trial
                  </Link>
                </td>
                <td className="bg-kal-accent/[0.04] px-3 py-4 text-center ring-2 ring-inset ring-kal-accent/30">
                  <Link
                    href="/pricing"
                    className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-kal-accent px-5 text-sm font-bold text-white shadow-[0_4px_16px_rgba(255,122,0,0.28)] transition hover:brightness-105"
                  >
                    Choose Smart Plan
                  </Link>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        </div>{/* end hidden md:block */}
      </div>
    </section>
  );
}

function PlanCardsSection() {
  const cards: {
    name: string;
    price: string;
    duration: string;
    tag: string | null;
    tagColor: string;
    borderClass: string;
    badgeBg: string;
    badgeText: string;
    cta: string;
    ctaHref: string;
    ctaClass: string;
    intro: string;
    bullets: string[];
  }[] = [
    {
      name: "Basic",
      price: "₹0",
      duration: "3 days",
      tag: null,
      tagColor: "",
      borderClass: "border-kal-border",
      badgeBg: "bg-kal-card-muted",
      badgeText: "text-kal-muted",
      cta: "Start 3-Day Free Basic Plan",
      ctaHref: "/auth",
      ctaClass:
        "border border-kal-border bg-kal-card text-kal-text hover:border-kal-accent/40 hover:text-kal-accent",
      intro: "For students who want to build the habit before spending anything.",
      bullets: [
        "Daily planner + syllabus tracker",
        "Focus timer + study camera",
        "Streak + consistency heatmap",
        "Doubt tracker",
        "3 days · No card · No pressure",
        "After Day 3: AI tools pause — marks engine, rank prediction, spaced revision, daily log, PrepBrain AI, voice control",
        "Streaks don't reset. Data doesn't disappear. Everything waits.",
      ],
    },
    {
      name: "Smart Trial",
      price: "₹19",
      duration: "3 days",
      tag: "See everything",
      tagColor: "text-kal-accent-dark dark:text-kal-accent",
      borderClass: "border-kal-accent/40",
      badgeBg: "bg-kal-accent-soft",
      badgeText: "text-kal-accent-dark dark:text-kal-accent",
      cta: "Start Smart Trial for ₹19",
      ctaHref: "/auth",
      ctaClass:
        "border border-kal-accent/40 bg-kal-card text-kal-text hover:bg-kal-accent hover:text-white",
      intro: "For students who want proof before committing monthly.",
      bullets: [
        "Marks engine + rank prediction",
        "Spaced revision engine + daily prep insights",
        "PrepBrain AI coach",
        "Voice control — 15 min · 5 lakh tokens",
        "₹19 is one-time, not recurring",
        "Upgrade after → continues seamlessly",
        "Don't upgrade → falls back to Basic access",
      ],
    },
    {
      name: "Smart Plan",
      price: "₹499",
      duration: "per month",
      tag: "Most popular",
      tagColor: "text-white",
      borderClass: "border-kal-accent/60",
      badgeBg: "bg-kal-accent",
      badgeText: "text-white",
      cta: "Choose Smart Plan",
      ctaHref: "/pricing",
      ctaClass:
        "bg-kal-accent text-white shadow-[0_4px_16px_rgba(255,122,0,0.28)] hover:brightness-105",
      intro: "The actual system. Everything, every month.",
      bullets: [
        "Everything in Basic, plus the full AI layer",
        "Marks engine + rank prediction",
        "Spaced revision engine · Daily log · Prep insights",
        "PrepBrain AI coach",
        "Voice control — 60 min/month",
        "20 lakh PrepBrain tokens/month",
        "AutoPay: you choose 1–12 months, stops on its own",
        "Cancel anytime from settings — no calls, no forms",
      ],
    },
  ];

  return (
    <section className="bg-kal-page-end py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <div className="mb-10 text-center">
          <h2
            className="text-2xl font-normal tracking-tight text-kal-text sm:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            What each plan is really for.
          </h2>
          <p className="mt-2 text-sm text-kal-muted">
            Not features. Honest descriptions of who each plan is built for.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.name}
              className={`kal-glass-panel flex flex-col rounded-2xl border-2 ${card.borderClass} p-6 transition-shadow hover:shadow-[var(--kal-shadow-card-hover)]`}
            >
              {/* Plan header */}
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-kal-muted">
                    Plan
                  </p>
                  <h3
                    className="mt-0.5 text-xl font-normal text-kal-text"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {card.name}
                  </h3>
                </div>
                <div className="text-right">
                  <p
                    className="text-2xl font-normal text-kal-text"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {card.price}
                  </p>
                  <p className="text-xs text-kal-muted">{card.duration}</p>
                </div>
              </div>

              {card.tag && (
                <span
                  className={`mb-4 inline-flex self-start rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${card.badgeBg} ${card.tagColor}`}
                >
                  {card.tag}
                </span>
              )}

              {/* Intro line */}
              <p className="mb-4 text-sm font-medium text-kal-text">{card.intro}</p>

              {/* Bullet points */}
              <ul className="flex-1 space-y-2">
                {card.bullets.map((point) => (
                  <li key={point} className="flex items-start gap-2.5">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-kal-accent/70"
                      aria-hidden
                    />
                    <span className="text-sm leading-snug text-kal-text-secondary">{point}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href={card.ctaHref}
                className={`mt-6 inline-flex min-h-[48px] items-center justify-center rounded-full px-6 text-sm font-bold transition ${card.ctaClass}`}
              >
                {card.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PathSection() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-10 text-center">
          <h2
            className="text-2xl font-normal tracking-tight text-kal-text sm:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Your path to Smart Plan.
          </h2>
          <p className="mt-2 text-sm text-kal-muted">
            Two starting points. One destination. Both work.
          </p>
        </div>
        <PathFlowchart />
      </div>
    </section>
  );
}

function AutopaySection() {
  return (
    <section className="bg-kal-page-end py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-10 text-center">
          <h2
            className="text-2xl font-normal tracking-tight text-kal-text sm:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            On the autopay.
          </h2>
          <p className="mt-2 max-w-xl mx-auto text-sm text-kal-muted">
            You control the duration. Slide to choose how long autopay runs.
          </p>
        </div>
        <AutopaySlider />
      </div>
    </section>
  );
}


function FAQSection() {
  return (
    <section className="bg-kal-page-end py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-6">
        <div className="mb-10 text-center">
          <h2
            className="text-2xl font-normal tracking-tight text-kal-text sm:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Quick answers.
          </h2>
          <p className="mt-2 text-sm text-kal-muted">
            The questions that usually come up before signing up.
          </p>
        </div>
        <PricingFAQ />
      </div>
    </section>
  );
}

function ExamFooterStrip() {
  return (
    <section className="border-t border-kal-border py-10">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <p className="text-sm font-medium leading-relaxed text-kal-muted">
          Kalnehi Daily · JEE · NEET · UPSC · CA · SSC · Banking · GATE · CAT · CLAT and more
        </p>
        <p className="mt-3 text-xs text-kal-muted/70">
          One system. Every serious exam.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/auth"
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-kal-accent px-8 text-base font-bold text-white shadow-[0_4px_16px_rgba(255,122,0,0.28)] transition hover:brightness-105 active:scale-[0.98] sm:w-auto"
          >
            Start 3-Day Free Basic Plan
          </Link>
          <Link
            href="/auth"
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full border border-kal-border bg-kal-card/70 px-8 text-base font-semibold text-kal-text backdrop-blur-sm transition hover:border-kal-accent/40 hover:text-kal-accent sm:w-auto"
          >
            Start Smart Trial for ₹19
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────── Export ────────────────────────────── */

export function PricingPageContent() {
  return (
    <div className="w-full">
      <HeroSection />
      <PricingTableSection />
      <PlanCardsSection />
      <PathSection />
      <AutopaySection />
      <FAQSection />
      <ExamFooterStrip />
    </div>
  );
}
