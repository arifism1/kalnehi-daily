import Link from "next/link";

import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/guides/daily-exam-prep-system-any-exam",
  title: `Daily Exam Prep System — works for JEE, NEET, CUET, UPSC & more | ${SITE_NAME}`,
  description: `Public guide: one daily execution system for any competitive exam — weekly intent, honest todos, timed sessions, revision loops, and habits. Pair with ${SITE_NAME} as your installable PWA planner.`,
});

export default function DailyExamPrepSystemGuidePage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          {
            name: "Daily exam prep system",
            path: "/guides/daily-exam-prep-system-any-exam",
          },
        ]}
        faqs={[
          {
            question: "Does this system work for non-engineering exams?",
            answer:
              "Yes. The loop is the same: weekly goals, daily tasks, timed focused work, honest review, and visible streaks. You swap the subjects and reading lists — not the structure.",
          },
          {
            question: "What is the smallest version of this system?",
            answer:
              "Three parts: a weekly map with three outcomes you actually want to hit, a daily checklist that fits your real hours, and a short review block before you start anything new.",
          },
          {
            question: `How does ${SITE_NAME} fit in?`,
            answer:
              "It's the execution layer: planner, syllabus tracking, study sessions, habits, and optional PrepBrain AI coaching — installable as a PWA after you sign in.",
          },
        ]}
      />
      <article className="space-y-8 text-sm leading-relaxed text-kal-text-secondary">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-kal-accent">
            General guide · any competitive exam
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-kal-text sm:text-3xl">
            A daily exam prep system that survives bad weeks
          </h1>
          <p className="text-base">
            JEE, NEET UG, NEET PG, CUET, UPSC, state PSC, GATE, CA foundation — different syllabi,
            same failure mode:{" "}
            <strong className="text-kal-text">ambitious plans and poor follow-through</strong>. Here&apos;s
            a simple loop that doesn&apos;t require a fresh notebook every month.
          </p>
        </header>

        <section className="space-y-2" aria-labelledby="loop-week">
          <h2 id="loop-week" className="text-lg font-semibold text-kal-text">
            1. Plan in weeks, not in vibes
          </h2>
          <p>
            Pick three outcomes that would make the week feel worthwhile — one weak chapter addressed,
            one mock reviewed, one habit streak kept alive. If the week goes sideways, carry the work
            forward. Don&apos;t erase it.
          </p>
        </section>

        <section className="space-y-2" aria-labelledby="loop-day">
          <h2 id="loop-day" className="text-lg font-semibold text-kal-text">
            2. Build daily lists you can actually finish
          </h2>
          <p>
            Your daily list should fit the hours you genuinely have — not the hours you wish you had.
            A short honest list beats a long optimistic one. Finishing matters more than looking
            productive.
          </p>
        </section>

        <section className="space-y-2" aria-labelledby="loop-deep">
          <h2 id="loop-deep" className="text-lg font-semibold text-kal-text">
            3. Protect your deep work with a timer
          </h2>
          <p>
            One 50–90 minute block, one thing to work on. Phone face-down. When the timer goes off,
            you can be honest with yourself about whether you were actually studying or just in the
            room.
          </p>
        </section>

        <section className="space-y-2" aria-labelledby="loop-review">
          <h2 id="loop-review" className="text-lg font-semibold text-kal-text">
            4. Review before you pile on new material
          </h2>
          <p>
            Wrong questions, skipped chapters, and half-understood notes are where your rank slips.
            A short review block before new content is almost always a better use of time than
            another chapter of passive reading.
          </p>
        </section>

        <section className="rounded-2xl border border-kal-border bg-kal-accent-soft/40 px-4 py-5">
          <h2 className="text-lg font-semibold text-kal-text">Exam-specific guides on this site</h2>
          <ul className="mt-3 list-inside list-disc space-y-1">
            <li>
              <Link href="/jee-study-planner" className="font-medium text-kal-accent-dark hover:underline">
                JEE Main & Advanced
              </Link>
            </li>
            <li>
              <Link href="/neet-study-planner" className="font-medium text-kal-accent-dark hover:underline">
                NEET UG
              </Link>
            </li>
            <li>
              <Link href="/neet-pg-study-planner" className="font-medium text-kal-accent-dark hover:underline">
                NEET PG / clinical entrances
              </Link>
            </li>
            <li>
              <Link href="/cuet-ug-study-planner" className="font-medium text-kal-accent-dark hover:underline">
                CUET UG
              </Link>
            </li>
            <li>
              <Link href="/upsc-study-planner" className="font-medium text-kal-accent-dark hover:underline">
                UPSC CSE
              </Link>
            </li>
            <li>
              <Link href="/boards-study-planner" className="font-medium text-kal-accent-dark hover:underline">
                Boards + competitive balance
              </Link>
            </li>
          </ul>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/auth"
            className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-kal-accent px-6 text-sm font-bold text-kal-accent-foreground"
          >
            Run this system in {SITE_NAME}
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
