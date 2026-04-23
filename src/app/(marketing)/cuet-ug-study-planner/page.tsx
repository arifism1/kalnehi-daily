import Link from "next/link";

import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/cuet-ug-study-planner",
  title: `CUET UG Study Planner — domain + general test in one weekly rhythm | ${SITE_NAME}`,
  description: `CUET UG prep planner: balance domain subjects and the general test without dropping daily output. ${SITE_NAME} — weekly planner, syllabus tracking, study sessions, habits & PWA for CUET 2026 aspirants.`,
});

export default function CuetUgStudyPlannerPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "CUET UG study planner", path: "/cuet-ug-study-planner" },
        ]}
        faqs={[
          {
            question: "Does this work for all CUET UG domain choices?",
            answer:
              "Yes. You label your own domain subjects in tasks and weekly lanes — sciences, commerce, humanities, or languages. The app does not hard-code one stream.",
          },
          {
            question: "How do I balance domain papers and the general test?",
            answer:
              "Use a weekly map with fixed minimums for each side, then daily todos that respect school or coaching hours. Adjust when one side spikes before a deadline.",
          },
          {
            question: `Can I install ${SITE_NAME} on my phone?`,
            answer:
              "Yes. After signing in on Chrome for Android, add to home screen for a full-screen PWA.",
          },
          {
            question: "Is there a free tier?",
            answer:
              `${SITE_NAME} offers a 3-day free trial (no card required), then Smart Plan at ₹499/month — see pricing. These public guides stay free to read.`,
          },
        ]}
      />

      <Breadcrumbs items={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "CUET UG study planner", path: "/cuet-ug-study-planner" },
        ]} className="mb-2" />
      <article className="space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-kal-accent">
            CUET-UG · 2026 cycle
          </p>
          <h1 className="kal-feature-title">
            CUET UG study planner — one rhythm for domain + general test
          </h1>
          <p className="text-sm leading-relaxed text-kal-text-secondary sm:text-base">
            CUET is two different games in one form:{" "}
            <strong className="text-kal-text">domain depth</strong> and{" "}
            <strong className="text-kal-text">general aptitude</strong>. Most students lose weeks
            favouring one side. {SITE_NAME} keeps both visible in the same weekly map and daily
            checklist — so neither side quietly dies.
          </p>
        </header>

        <section className="space-y-3" aria-labelledby="cuet-why">
          <h2 id="cuet-why" className="text-lg font-semibold text-kal-text">
            What breaks CUET timetables
          </h2>
          <p className="text-sm leading-relaxed text-kal-text-secondary">
            School tests, coaching, and “I will catch general test later.” Later becomes never. A
            planner that shows both sides every week fixes the blind spot before the admit card
            phase.
          </p>
        </section>

        <section className="space-y-3" aria-labelledby="cuet-how">
          <h2 id="cuet-how" className="text-lg font-semibold text-kal-text">
            Built for CUET-style split prep
          </h2>
          <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-kal-text-secondary">
            <li>
              <strong className="text-kal-text">Weekly planner:</strong> minimum blocks for domain
              and for general test — non-negotiable floors, not vibes.
            </li>
            <li>
              <strong className="text-kal-text">Daily todos:</strong> small wins you can finish
              after school — not a fantasy 8-hour list.
            </li>
            <li>
              <strong className="text-kal-text">Study sessions:</strong> timed blocks for mocks,
              speed drills, and theory — with real minutes logged.
            </li>
            <li>
              <strong className="text-kal-text">Habits:</strong> vocabulary, current awareness
              snippets, formula recall — short streaks that add up.
            </li>
          </ul>
        </section>

        <nav className="text-sm" aria-label="Related reading">
          <p className="font-medium text-kal-text">Keep reading</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-kal-text-secondary">
            <li>
              <Link href="/boards-study-planner" className="font-medium text-kal-accent-dark hover:underline">
                Board exam planner (school + prep)
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
              <Link href="/jee-study-planner" className="font-medium text-kal-accent-dark hover:underline">
                JEE 2026 daily planner
              </Link>
            </li>
          </ul>
        </nav>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/auth"
            className="kal-btn-accent flex-1 min-h-[48px]"
          >
            Start your CUET plan
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
