import Link from "next/link";
import { Check, Minus } from "lucide-react";

import type { DailyCapStatus } from "@/lib/daily-trial-cap";
import { PathFlowchart } from "./PathFlowchart";
import { PricingFAQ } from "./PricingFAQ";
import { PricingPageClient } from "./PricingPageClient";
import { PricingTableMobile } from "./PricingTableMobile";

/* ─────────────────────────────── Data ─────────────────────────────── */

type FeatureValue = boolean | string | null;

const FEATURES: { name: string; trial: FeatureValue; smart: FeatureValue }[] = [
  { name: "Daily planner", trial: true, smart: true },
  { name: "Syllabus tracker", trial: true, smart: true },
  { name: "Focus timer + study camera", trial: true, smart: true },
  { name: "Streak + consistency heatmap", trial: true, smart: true },
  { name: "Doubt tracker", trial: true, smart: true },
  { name: "Marks engine + rank prediction", trial: true, smart: true },
  { name: "Revision reminders", trial: true, smart: true },
  { name: "Daily log & prep insights", trial: true, smart: true },
  { name: "PrepBrain AI coach", trial: true, smart: true },
  { name: "Voice control", trial: "12 min total", smart: "100 min/month" },
  { name: "PrepBrain tokens", trial: "60,000 total", smart: "20,00,000/month" },
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

function HeroSection({ capStatus }: { capStatus: DailyCapStatus }) {
  const capFull = capStatus.capEnabled && capStatus.isFull;
  const cap = capStatus.dailyCap;

  return (
    <section className="relative overflow-hidden pb-16 pt-12 sm:pb-20 sm:pt-16 lg:pb-24 lg:pt-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 0%, var(--kal-landing-hero-radial) 0%, transparent 65%)",
        }}
      />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-kal-accent/30 bg-kal-accent-soft px-4 py-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-kal-accent" aria-hidden />
          <span className="text-xs font-bold uppercase tracking-widest text-kal-accent-dark dark:text-kal-accent">
            Kalnehi Daily
          </span>
        </div>

        <h1
          className="text-4xl font-normal leading-[1.1] tracking-tight text-kal-text sm:text-5xl lg:text-6xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          One system for serious exam prep.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-kal-text-secondary sm:text-xl">
          Up to {cap.toLocaleString("en-IN")} free trials available each day. Spots reset at midnight IST.
        </p>

        {capFull ? (
          <div className="mt-10 flex flex-col items-center gap-3">
            <Link
              href="/waitlist/position"
              className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-kal-accent px-8 text-base font-bold text-white shadow-[0_4px_16px_rgba(255,122,0,0.32)] transition hover:brightness-105 active:scale-[0.98] sm:w-auto"
            >
              Don&apos;t want to wait? Start now for ₹19 →
            </Link>
            <p className="text-sm text-kal-text-secondary">
              Today&apos;s free spots are full — new spots at midnight IST
            </p>
          </div>
        ) : (
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/#subscribe"
              className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-kal-accent px-8 text-base font-bold text-white shadow-[0_4px_16px_rgba(255,122,0,0.32)] transition hover:brightness-105 active:scale-[0.98] sm:w-auto"
            >
              Start free — 3 days on us →
            </Link>
            <a
              href="#pricing-table"
              className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full border border-kal-border bg-kal-card/70 px-8 text-base font-semibold text-kal-text backdrop-blur-sm transition hover:border-kal-accent/40 hover:text-kal-accent sm:w-auto"
            >
              See what&apos;s inside ↓
            </a>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {[
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

function HowItWorksSection({ capStatus }: { capStatus: DailyCapStatus }) {
  const cap = capStatus.dailyCap;
  const steps = [
    {
      num: "①",
      title: "Sign up",
      body: "Create your account in 60 seconds.",
    },
    {
      num: "②",
      title: "Claim a free spot",
      body: `Up to ${cap.toLocaleString("en-IN")} spots available each day. Spots reset at midnight IST.`,
    },
    {
      num: "③",
      title: "Try free, then decide",
      body: "3 days of full access. Subscribe to Smart Plan if you want to continue.",
    },
  ];

  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-4xl px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.num}
              className="kal-glass-panel rounded-2xl border border-kal-border p-6"
            >
              <p
                className="mb-2 text-3xl font-normal text-kal-accent"
                style={{ fontFamily: "var(--font-display)" }}
                aria-hidden
              >
                {step.num}
              </p>
              <h3 className="text-base font-semibold text-kal-text">{step.title}</h3>
              <p className="mt-1 text-sm leading-snug text-kal-text-secondary">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingTableSection() {
  return (
    <section id="pricing-table" className="py-16 sm:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <h2
            className="text-2xl font-normal tracking-tight text-kal-text sm:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            What you get
          </h2>
          <p className="mt-2 text-sm text-kal-muted">Everything unlocked during your trial. Keep it all with Smart Plan.</p>
        </div>

        {/* Mobile: tab switcher (hidden on md+) */}
        <div className="md:hidden">
          <PricingTableMobile />
        </div>

        {/* Desktop: full comparison table (hidden below md) */}
        <div className="hidden md:block">
          <div className="overflow-x-auto rounded-2xl border border-kal-border shadow-[var(--kal-shadow-card)]">
            <table className="w-full min-w-[480px] border-collapse">
              <thead>
                <tr>
                  <th className="w-[44%] bg-kal-card/80 px-4 py-5 text-left sm:px-6">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-kal-muted">
                      Feature
                    </span>
                  </th>

                  {/* 3-Day Free Trial */}
                  <th className="w-[28%] bg-kal-card/80 px-3 py-5 text-center align-top">
                    <p className="text-xs font-bold uppercase tracking-wider text-kal-text-secondary">
                      3-Day Free Trial
                    </p>
                    <p
                      className="mt-1 text-2xl font-normal text-kal-text"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      ₹0
                    </p>
                    <p className="text-xs text-kal-muted">No card needed</p>
                    <Link
                      href="/#subscribe"
                      className="mt-3 inline-flex min-h-[36px] items-center justify-center rounded-full border border-kal-border bg-kal-card px-3 text-xs font-semibold text-kal-text transition hover:border-kal-accent/40 hover:text-kal-accent"
                    >
                      Start free today
                    </Link>
                  </th>

                  {/* Smart Plan — highlighted */}
                  <th className="w-[28%] bg-gradient-to-b from-kal-accent/10 to-kal-card/90 px-3 py-5 text-center align-top ring-2 ring-inset ring-kal-accent/50">
                    <span className="inline-block rounded-full bg-kal-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Smart Plan
                    </span>
                    <div className="mt-2 flex items-baseline justify-center gap-0.5">
                      <p
                        className="text-2xl font-normal text-kal-text"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        ₹399
                      </p>
                      <span className="text-xs text-kal-muted">/mo</span>
                    </div>
                    <Link
                      href="#subscribe"
                      className="mt-3 inline-flex min-h-[36px] items-center justify-center rounded-full bg-kal-accent px-4 text-xs font-bold text-white shadow-[0_4px_12px_rgba(255,122,0,0.3)] transition hover:brightness-105"
                    >
                      Subscribe
                    </Link>
                  </th>
                </tr>
              </thead>

              <tbody>
                {FEATURES.map(({ name, trial, smart }, i) => (
                  <tr
                    key={name}
                    className={i % 2 === 0 ? "bg-kal-card/30" : "bg-transparent"}
                  >
                    <td className="px-4 py-3.5 text-sm font-medium text-kal-text-secondary sm:px-6">
                      {name}
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

              <tfoot>
                <tr className="border-t border-kal-border">
                  <td className="px-4 py-4 sm:px-6" />
                  <td className="px-3 py-4 text-center">
                    <Link
                      href="/#subscribe"
                      className="inline-flex min-h-[40px] items-center justify-center rounded-full border border-kal-border px-4 text-sm font-semibold text-kal-text-secondary transition hover:border-kal-accent/40 hover:text-kal-accent"
                    >
                      Start free today
                    </Link>
                  </td>
                  <td className="bg-kal-accent/[0.04] px-3 py-4 text-center ring-2 ring-inset ring-kal-accent/30">
                    <Link
                      href="#subscribe"
                      className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-kal-accent px-5 text-sm font-bold text-white shadow-[0_4px_16px_rgba(255,122,0,0.28)] transition hover:brightness-105"
                    >
                      Subscribe — ₹399/mo
                    </Link>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlanCardsSection({ capStatus }: { capStatus: DailyCapStatus }) {
  const cap = capStatus.dailyCap;
  const cards: {
    name: string;
    price: string;
    duration: string;
    annualNote?: string;
    tag: string | null;
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
      name: "Free Trial",
      price: "₹0",
      duration: "3-day trial",
      tag: "Start here",
      borderClass: "border-kal-border",
      badgeBg: "bg-kal-card-muted",
      badgeText: "text-kal-muted",
      cta: "Start free today →",
      ctaHref: "/#subscribe",
      ctaClass:
        "border border-kal-border bg-kal-card text-kal-text hover:border-kal-accent/40 hover:text-kal-accent",
      intro: `Up to ${cap.toLocaleString("en-IN")} free spots available each day. Spots reset at midnight IST.`,
      bullets: [
        "Daily planner + syllabus tracker",
        "Focus timer + study camera",
        "Streak + consistency heatmap",
        "Doubt tracker",
        "Marks engine + rank prediction",
        "Revision reminders + daily log",
        "PrepBrain AI coach",
        "Voice control — 12 minutes total",
        "PrepBrain AI tokens — 60,000 total",
      ],
    },
    {
      name: "Smart Plan",
      price: "₹399",
      duration: "per month",
      annualNote: "or ₹2,154/6 months (10% off) · ₹3,591/year (25% off)",
      tag: "Most popular",
      borderClass: "border-kal-accent/60",
      badgeBg: "bg-kal-accent",
      badgeText: "text-white",
      cta: "Subscribe — ₹399/month",
      ctaHref: "#subscribe",
      ctaClass:
        "bg-kal-accent text-white shadow-[0_4px_16px_rgba(255,122,0,0.28)] hover:brightness-105",
      intro: "The full system, every month. Unlimited AI. 100 minutes of voice.",
      bullets: [
        "Everything in the free trial, every month",
        "PrepBrain AI — 20 lakh tokens/month",
        "Voice control — 100 minutes/month",
        "Marks engine + rank prediction",
        "Revision reminders + daily log + prep insights",
        "AutoPay: choose 1–12 months, stops on its own",
        "Cancel anytime from settings — no calls, no forms",
      ],
    },
  ];

  const skipCard: (typeof cards)[number] = {
    name: "Skip the queue",
    price: "₹19",
    duration: "one time",
    tag: "Fastest",
    borderClass: "border-kal-accent/40",
    badgeBg: "bg-kal-accent/15",
    badgeText: "text-kal-accent",
    cta: "Start today →",
    ctaHref: "/waitlist/position",
    ctaClass:
      "border border-kal-accent/60 bg-kal-accent/10 text-kal-accent hover:bg-kal-accent/15",
    intro: "Don't want to wait for a batch? ₹19 gets you in right now.",
    bullets: [
      "Immediate access — no queue",
      "Same 3-day free trial as batch users",
      "60,000 PrepBrain tokens included",
      "12 minutes voice included",
      "One-time payment, no recurring charge",
    ],
  };

  return (
    <section className="bg-kal-page-end py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-6 sm:px-8">
        <div className="mb-10 text-center">
          <h2
            className="text-2xl font-normal tracking-tight text-kal-text sm:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Three simple options.
          </h2>
          <p className="mt-2 text-sm text-kal-muted">
            Start free today, skip the wait, or subscribe directly.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {[...cards.slice(0, 1), skipCard, ...cards.slice(1)].map((card) => (
            <div
              key={card.name}
              className={`kal-glass-panel flex flex-col rounded-2xl border-2 ${card.borderClass} p-6 transition-shadow hover:shadow-[var(--kal-shadow-card-hover)]`}
            >
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
                  {card.annualNote && (
                    <a
                      href="#subscribe"
                      className="mt-1 block text-[10px] font-semibold text-kal-accent hover:underline"
                    >
                      {card.annualNote}
                    </a>
                  )}
                </div>
              </div>

              {card.tag && (
                <span
                  className={`mb-4 inline-flex self-start rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${card.badgeBg} ${card.badgeText}`}
                >
                  {card.tag}
                </span>
              )}

              <p className="mb-4 text-sm font-medium text-kal-text">{card.intro}</p>

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
      <div className="mx-auto max-w-4xl px-6">
        <div className="mb-10 text-center">
          <h2
            className="text-2xl font-normal tracking-tight text-kal-text sm:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Your path forward.
          </h2>
          <p className="mt-2 text-sm text-kal-muted">
            Three days free. One plan after that.
          </p>
        </div>
        <PathFlowchart />
      </div>
    </section>
  );
}


function CheckoutSection() {
  return (
    <section id="subscribe" className="py-16 sm:py-20 scroll-mt-16">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-10 text-center">
          <h2
            className="text-2xl font-normal tracking-tight text-kal-text sm:text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Subscribe to Smart Plan.
          </h2>
          <p className="mt-2 text-sm text-kal-muted">
            ₹399/month · cancel anytime · AutoPay for the duration you choose.
          </p>
        </div>
        <PricingPageClient />
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
            href="/#subscribe"
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-kal-accent px-8 text-base font-bold text-white shadow-[0_4px_16px_rgba(255,122,0,0.28)] transition hover:brightness-105 active:scale-[0.98] sm:w-auto"
          >
            Start free — 3 days on us →
          </Link>
          <Link
            href="#subscribe"
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full border border-kal-border bg-kal-card/70 px-8 text-base font-semibold text-kal-text backdrop-blur-sm transition hover:border-kal-accent/40 hover:text-kal-accent sm:w-auto"
          >
            Subscribe — ₹399/month
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────── Export ────────────────────────────── */

export function PricingPageContent({ capStatus }: { capStatus: DailyCapStatus }) {
  return (
    <div className="w-full">
      <HeroSection capStatus={capStatus} />
      <HowItWorksSection capStatus={capStatus} />
      <PricingTableSection />
      <PlanCardsSection capStatus={capStatus} />
      <CheckoutSection />
      <FAQSection />
      <ExamFooterStrip />
    </div>
  );
}
