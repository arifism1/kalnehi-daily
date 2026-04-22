import Link from "next/link";

import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/neet-study-planner",
  title: `Best Daily Planner for NEET 2026 — PCB drills & daily output | ${SITE_NAME}`,
  description: `Best daily planner for NEET 2026: PCB theory, question banks, and mock review in one rhythm. ${SITE_NAME} — weekly planner, syllabus tracking, study sessions, habits & installable PWA for NEET-UG.`,
});

export default function NeetStudyPlannerPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "Best daily planner for NEET 2026", path: "/neet-study-planner" },
        ]}
        faqs={[
          {
            question: "What makes a NEET 2026 daily planner different from a diary?",
            answer:
              `It ties daily output to PCB scope: drills, recall, and timed practice — not just “study Biology”. ${SITE_NAME} makes that output visible across the week.`,
          },
          {
            question: "How do I balance NEET with Board exams?",
            answer:
              "Use routines and todos to reserve Board blocks while keeping NEET drills non‑negotiable in your weekly map — adjust when school tests spike.",
          },
          {
            question: `Can I install ${SITE_NAME} on my phone?`,
            answer:
              "Yes. Sign in on Chrome for Android, then install the PWA for a full-screen experience and offline-friendly caching of pages you have opened.",
          },
          {
            question: "What is PrepBrain AI?",
            answer:
              "An optional syllabus-aware assistant on paid tiers — for quick clarifications, not a substitute for NCERT and coaching.",
          },
        ]}
      />

      <Breadcrumbs items={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "Best daily planner for NEET 2026", path: "/neet-study-planner" },
        ]} className="mb-2" />
      <article className="space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-kal-accent">
            NEET-UG · 2026 cycle
          </p>
          <h1 className="kal-feature-title">
            Best daily planner for NEET 2026 — throughput you can repeat
          </h1>
          <p className="text-sm leading-relaxed text-kal-text-secondary sm:text-base">
            NEET <strong className="text-kal-text">2026</strong> punishes passive reading and rewards
            recall under time pressure. {SITE_NAME} focuses on repeatable daily output: PCB tasks,
            session timers, syllabus-linked progress, and habits — so you cannot hide weak chapters
            until the last month.
          </p>
        </header>

        <section className="space-y-3" aria-labelledby="neet-mistakes">
          <h2 id="neet-mistakes" className="text-lg font-semibold text-kal-text">
            Where NEET prep usually leaks time
          </h2>
          <p className="text-sm leading-relaxed text-kal-text-secondary">
            Endless new theory, weak PYQ loops, and mock papers without honest error review. The fix is
            structured blocks: each day should show drills completed, mistakes tagged, and sleep
            protected. {SITE_NAME} is built around that honesty — not aesthetic highlight reels.
          </p>
        </section>

        <section className="space-y-3" aria-labelledby="neet-stack">
          <h2 id="neet-stack" className="text-lg font-semibold text-kal-text">
            Inside {SITE_NAME} for NEET
          </h2>
          <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-kal-text-secondary">
            <li>
              <strong className="text-kal-text">Daily & weekly planning:</strong> Biology depth without
              abandoning Physics numericals and Chemistry drills.
            </li>
            <li>
              <strong className="text-kal-text">Syllabus Tracker:</strong> weight and completion so
              revision months stay focused.
            </li>
            <li>
              <strong className="text-kal-text">Habits & streaks:</strong> flashcards, formula recall,
              last-year questions — compounding edges.
            </li>
          </ul>
        </section>

        <nav className="text-sm" aria-label="Related reading">
          <p className="font-medium text-kal-text">You might also like</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-kal-text-secondary">
            <li>
              <Link href="/jee-study-planner" className="font-medium text-kal-accent-dark hover:underline">
                Best daily planner for JEE 2026
              </Link>
            </li>
            <li>
              <Link href="/upsc-study-planner" className="font-medium text-kal-accent-dark hover:underline">
                Best daily planner for UPSC CSE
              </Link>
            </li>
            <li>
              <Link href="/brain-yoga" className="font-medium text-kal-accent-dark hover:underline">
                Brain Yoga for exam warriors
              </Link>
            </li>
          </ul>
        </nav>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/auth" className="kal-btn-accent min-h-[48px] flex-1 text-center">
            Build your NEET 2026 plan
          </Link>
          <Link href="/guides" className="kal-btn-ghost min-h-[48px] flex-1 text-center">
            All guides
          </Link>
        </div>
      </article>
    </>
  );
}
