import Link from "next/link";

import type { DailyCapStatus } from "@/lib/daily-trial-cap";
import { SMART_PLAN_MONTHLY_DISPLAY } from "@/lib/smartPlanPricing";
import { FeatureCell, PRICING_FEATURES } from "@/lib/pricingFeatures";
import { PricingFAQ } from "./PricingFAQ";
import { PricingPageClient } from "./PricingPageClient";
import { PricingTableMobile } from "./PricingTableMobile";

/* ────────────────────────────── Sections ───────────────────────────── */

function HeroSection({ capStatus }: { capStatus: DailyCapStatus }) {
  const capFull = capStatus.capEnabled && capStatus.isFull;

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
          The voice-controlled exam prep tracker for serious aspirants.
        </h1>

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
              Start free — 7 days on us →
            </Link>
            <a
              href="#pricing-table"
              className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full border border-kal-border bg-kal-card/70 px-8 text-base font-semibold text-kal-text backdrop-blur-sm transition hover:border-kal-accent/40 hover:text-kal-accent sm:w-auto"
            >
              See what&apos;s inside ↓
            </a>
          </div>
        )}
      </div>
    </section>
  );
}


function PricingTableSection() {
  return (
    <section id="pricing-table" className="scroll-mt-16 pb-16 pt-6 sm:pb-20 sm:pt-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
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

                  {/* 7-Day Free Trial */}
                  <th className="w-[28%] bg-kal-card/80 px-3 py-5 text-center align-top">
                    <p className="text-xs font-bold uppercase tracking-wider text-kal-text-secondary">
                      7-Day Free Trial
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
                        {SMART_PLAN_MONTHLY_DISPLAY}
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
                {PRICING_FEATURES.map(({ name, trial, smart }, i) => (
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


            </table>
          </div>
        </div>

        <div id="subscribe" className="mt-10 scroll-mt-16">
          <PricingPageClient />
        </div>
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
        <div className="mt-6 flex justify-center">
          <Link
            href="/#subscribe"
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-kal-accent px-8 text-base font-bold text-white shadow-[0_4px_16px_rgba(255,122,0,0.28)] transition hover:brightness-105 active:scale-[0.98] sm:w-auto"
          >
            Start free — 7 days on us →
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
      <PricingTableSection />
      <FAQSection />
      <ExamFooterStrip />
    </div>
  );
}
