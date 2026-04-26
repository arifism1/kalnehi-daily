import Link from "next/link";

import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/neet-pg-study-planner",
  title: `NEET PG & INI-CET Study Planner — clinical revision & daily output | ${SITE_NAME}`,
  description: `Plan NEET PG / INI-CET prep without drowning in notes: weekly lanes, syllabus-linked tasks, timed sessions, and habits in ${SITE_NAME} — installable PWA for interns and final-year MBBS students.`,
});

export default function NeetPgStudyPlannerPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "NEET PG study planner", path: "/neet-pg-study-planner" },
        ]}
        faqs={[
          {
            question: "Is this guide only for NEET PG?",
            answer:
              "It applies to any India clinical entrance with heavy MCQ revision — NEET PG, INI-CET, and similar patterns. You adapt subjects and weightage in your own weekly map.",
          },
          {
            question: "How does a daily planner help during internship?",
            answer:
              "Because your time is fragmented. A planner that works in 45–90 minute blocks and tracks what actually shipped beats a pretty timetable you cannot follow.",
          },
          {
            question: `Can I install ${SITE_NAME} as an app on my phone?`,
            answer:
              "Yes. Sign in on Chrome for Android, then add to home screen for a full-screen PWA with offline-friendly caching of pages you have opened.",
          },
          {
            question: "Is Mastermind required?",
            answer:
              "No. Mastermind is included in Smart Plan for quick clarifications. Your textbooks, notes, and question banks still drive rank.",
          },
        ]}
      />

      <Breadcrumbs items={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "NEET PG study planner", path: "/neet-pg-study-planner" },
        ]} className="mb-2" />
      <article className="space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-kal-accent">
            NEET PG · INI-CET · clinical cycle
          </p>
          <h1 className="kal-feature-title">
            NEET PG study planner — ship revision when your day is already full
          </h1>
          <p className="text-sm leading-relaxed text-kal-text-secondary sm:text-base">
            Internship hours, night shifts, and guilt about “not studying enough” are the default
            state. {SITE_NAME} is built for{" "}
            <strong className="text-kal-text">honest daily output</strong>: what you finished today,
            what slipped, and what moves tomorrow — without pretending you have twelve clean hours.
          </p>
        </header>

        <section className="space-y-3" aria-labelledby="neetpg-why">
          <h2 id="neetpg-why" className="text-lg font-semibold text-kal-text">
            What breaks most PG timetables
          </h2>
          <p className="text-sm leading-relaxed text-kal-text-secondary">
            Passive reading of notes, endless “I will start after this posting,” and no link between
            hours and recall. A good planner makes revision blocks small enough to survive real life
            and big enough to move the needle on MCQs.
          </p>
        </section>

        <section className="space-y-3" aria-labelledby="neetpg-how">
          <h2 id="neetpg-how" className="text-lg font-semibold text-kal-text">
            Built for clinical entrance execution
          </h2>
          <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-kal-text-secondary">
            <li>
              <strong className="text-kal-text">Weekly map:</strong> spread subjects so one bad
              week does not zero out the whole plan.
            </li>
            <li>
              <strong className="text-kal-text">Study sessions:</strong> log real minutes on
              problem-heavy blocks — not “time in the room.”
            </li>
            <li>
              <strong className="text-kal-text">Syllabus & progress:</strong> see what you have
              actually covered before the next mock.
            </li>
            <li>
              <strong className="text-kal-text">Habits:</strong> short daily drills — flashcards,
              image-based recall, one weak subject touch — that survive internship chaos.
            </li>
          </ul>
        </section>

        <nav className="text-sm" aria-label="Related reading">
          <p className="font-medium text-kal-text">Keep reading</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-kal-text-secondary">
            <li>
              <Link href="/neet-study-planner" className="font-medium text-kal-accent-dark hover:underline">
                Best daily planner for NEET UG
              </Link>
            </li>
            <li>
              <Link
                href="/guides/daily-exam-prep-system-any-exam"
                className="font-medium text-kal-accent-dark hover:underline"
              >
                Daily exam prep system (any exam)
              </Link>
            </li>
            <li>
              <Link href="/brain-yoga" className="font-medium text-kal-accent-dark hover:underline">
                Brain Yoga — short resets between blocks
              </Link>
            </li>
          </ul>
        </nav>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/auth"
            className="kal-btn-accent flex-1 min-h-[48px]"
          >
            Start your PG prep plan
          </Link>
          <Link
            href="/guides"
            className="kal-btn-ghost flex-1 min-h-[48px]"
          >
            All guides
          </Link>
        </div>
      </article>
    </>
  );
}
