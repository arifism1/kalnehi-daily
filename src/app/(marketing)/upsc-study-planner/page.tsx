import Link from "next/link";

import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/upsc-study-planner",
  title: `Best Daily Planner for UPSC CSE — Prelims, Mains & revision | ${SITE_NAME}`,
  description: `Plan GS papers, optional, and current affairs without losing weekly rhythm. ${SITE_NAME} is an installable PWA: weekly planner, habits, study sessions, and syllabus-style tracking for serious UPSC aspirants.`,
});

export default function UpscStudyPlannerPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "UPSC CSE study planner", path: "/upsc-study-planner" },
        ]}
        faqs={[
          {
            question: `Can ${SITE_NAME} replace UPSC coaching notes?`,
            answer:
              "No. It is an execution layer: you still choose sources and content. The app helps you ship consistent daily output — revision loops, timed answer practice, and habits.",
          },
          {
            question: "How do I plan Prelims vs Mains months?",
            answer:
              "Use weekly themes in the planner, daily todos for static portions, and study sessions for timed MCQ or writing blocks — align intensity to the exam calendar you follow.",
          },
          {
            question: "Does the app work offline?",
            answer:
              "After visiting online, the PWA caches assets and pages you have opened. Full sync and notifications need connectivity.",
          },
          {
            question: "Is there AI for UPSC?",
            answer:
              "PrepBrain AI may be available on paid tiers depending on your plan. Treat it as a supplement to standard books and tests — not a single source of truth.",
          },
        ]}
      />
      <article className="space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-kal-accent">
            UPSC Civil Services
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Best daily planner for UPSC CSE — execution beats inspiration
          </h1>
          <p className="text-sm leading-relaxed text-kal-text-secondary sm:text-base">
            UPSC rewards <strong className="text-kal-text">years of repeatable study days</strong>, not
            heroic one-offs. {SITE_NAME} helps you map GS, optional, and current affairs into a weekly
            rhythm: todos that clear, timers that protect deep work, and habits that survive bad weeks.
          </p>
        </header>

        <section className="space-y-3" aria-labelledby="upsc-why">
          <h2 id="upsc-why" className="text-lg font-semibold text-kal-text">
            Why planners fail for UPSC
          </h2>
          <p className="text-sm leading-relaxed text-kal-text-secondary">
            Vague “study 8 hours” goals collapse when life interrupts. You need visible output:
            pages revised, tests reviewed, answer outlines written. {SITE_NAME} nudges you toward
            measurable blocks — study sessions, streaks, and a planner you can adjust without guilt‑deleting
            the whole month.
          </p>
        </section>

        <section className="space-y-3" aria-labelledby="upsc-how">
          <h2 id="upsc-how" className="text-lg font-semibold text-kal-text">
            How {SITE_NAME} fits your stack
          </h2>
          <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-kal-text-secondary">
            <li>
              <strong className="text-kal-text">Weekly & daily planning:</strong> anchor Prelims
              subjects, Mains answer writing, and revision cycles in one view.
            </li>
            <li>
              <strong className="text-kal-text">Study sessions:</strong> time-box PYQs, tests, and
              long reads so distraction does not eat your evening.
            </li>
            <li>
              <strong className="text-kal-text">Habits:</strong> editorials, maps, ethics cases —
              small loops that compound across the year.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-kal-border bg-kal-accent-soft/40 px-4 py-5" aria-labelledby="upsc-pwa">
          <h2 id="upsc-pwa" className="text-lg font-semibold text-kal-text">
            Install {SITE_NAME} as a PWA
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-kal-text-secondary">
            On Android Chrome: sign in, then add to home screen for a focused shell — fewer tabs when
            switching between PDFs, tests, and your plan.
          </p>
        </section>

        <nav className="text-sm text-kal-text-secondary" aria-label="Related guides">
          <p className="font-medium text-kal-text">Read next</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              <Link className="text-kal-accent-dark hover:underline" href="/jee-study-planner">
                JEE 2026 daily planner
              </Link>
            </li>
            <li>
              <Link className="text-kal-accent-dark hover:underline" href="/neet-study-planner">
                NEET 2026 daily planner
              </Link>
            </li>
            <li>
              <Link className="text-kal-accent-dark hover:underline" href="/brain-yoga">
                Brain Yoga for exam warriors
              </Link>
            </li>
          </ul>
        </nav>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/auth"
            className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-kal-accent px-6 text-sm font-bold text-kal-accent-foreground"
          >
            Start with {SITE_NAME}
          </Link>
          <Link
            href="/guides"
            className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl border border-kal-border bg-kal-card px-6 text-sm font-semibold text-kal-text"
          >
            All guides
          </Link>
        </div>
      </article>
    </>
  );
}
