import Link from "next/link";

import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/jee-study-planner",
  title: `Best Daily Planner for JEE 2026 — JEE Main & Advanced execution | ${SITE_NAME}`,
  description: `Best daily planner for JEE 2026: weekly map, syllabus-weighted tasks, timed study sessions & habits. ${SITE_NAME} is an installable PWA for IIT-JEE — PCM revision, mocks, and consistency without chaos.`,
});

export default function JeeStudyPlannerPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "Best daily planner for JEE 2026", path: "/jee-study-planner" },
        ]}
        faqs={[
          {
            question: "Why use a dedicated JEE 2026 daily planner?",
            answer:
              "Because rank follows repeatable output: clear daily tasks, timed blocks, and revision loops — not vague “study more” intentions.",
          },
          {
            question: `Does ${SITE_NAME} cover JEE Main and Advanced together?`,
            answer:
              "You set your exam profile and plan phases accordingly — drop year, class 12, or parallel Boards. The planner adapts to your timeline.",
          },
          {
            question: `Can I install ${SITE_NAME} on Android for a full-screen app?`,
            answer:
              "Yes. After signing in with Chrome, add to home screen for standalone mode, offline-friendly caching of visited pages, and fewer distracting tabs.",
          },
          {
            question: "Is PrepBrain AI required for JEE prep?",
            answer:
              "No. PrepBrain AI is optional on paid plans for syllabus-aware Q&A — your NCERT, coaching, and mocks still come first.",
          },
        ]}
      />

      <Breadcrumbs items={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "Best daily planner for JEE 2026", path: "/jee-study-planner" },
        ]} className="mb-2" />
      <article className="space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-kal-accent">
            JEE Main & Advanced · 2026 cycle
          </p>
          <h1 className="kal-feature-title">
            Best daily planner for JEE 2026 — ship PCM output every single day
          </h1>
          <p className="text-sm leading-relaxed text-kal-text-secondary sm:text-base">
            The IIT-JEE race in <strong className="text-kal-text">2026</strong> rewards students who
            can execute when mocks go badly and schedules break. {SITE_NAME} turns your target date
            into weekly intent and daily tasks: Physics, Chemistry, and Mathematics in one execution
            system — not three separate notebooks.
          </p>
        </header>

        <section className="space-y-3" aria-labelledby="jee-why">
          <h2 id="jee-why" className="text-lg font-semibold text-kal-text">
            What breaks most JEE timetables
          </h2>
          <p className="text-sm leading-relaxed text-kal-text-secondary">
            Inconsistent revision, skipped numerical practice, and no honest link between hours spent and
            mock percentiles. A strong daily planner fixes visibility: what shipped today, what failed,
            and what gets carried — without rewriting the whole plan every Sunday night.
          </p>
        </section>

        <section className="space-y-3" aria-labelledby="jee-how">
          <h2 id="jee-how" className="text-lg font-semibold text-kal-text">
            Built for JEE execution — not generic checklists
          </h2>
          <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-kal-text-secondary">
            <li>
              <strong className="text-kal-text">Weekly planner:</strong> allocate PCM lanes so backlog
              does not become shame.
            </li>
            <li>
              <strong className="text-kal-text">Study sessions:</strong> protect problem-solving depth
              from phone distraction.
            </li>
            <li>
              <strong className="text-kal-text">Syllabus & progress:</strong> connect effort to scope —
              especially during revision months before JEE Main 2026.
            </li>
            <li>
              <strong className="text-kal-text">Habits:</strong> formula sheets, mistake logs, mock
              review — small streaks that survive bad weeks.
            </li>
          </ul>
        </section>

        <section className="kal-glass-card rounded-2xl px-4 py-5" aria-labelledby="jee-pwa">
          <h2 id="jee-pwa" className="text-lg font-semibold text-kal-text">
            Install the PWA — study like an app, not a tab farm
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-kal-text-secondary">
            Google surfaces installable PWAs when the manifest, icons, HTTPS, and service worker line
            up. {SITE_NAME} is optimized for that “Install” path on mobile search — open in Chrome,
            sign in, then add to home screen.
          </p>
        </section>

        <nav className="text-sm" aria-label="Related reading">
          <p className="font-medium text-kal-text">Keep reading</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-kal-text-secondary">
            <li>
              <Link
                href="/guides/how-to-maintain-consistency-in-jee-preparation"
                className="font-medium text-kal-accent-dark hover:underline"
              >
                How to maintain consistency in JEE preparation
              </Link>
            </li>
            <li>
              <Link href="/neet-study-planner" className="font-medium text-kal-accent-dark hover:underline">
                Best daily planner for NEET 2026
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
            Start your JEE 2026 plan
          </Link>
          <Link href="/guides" className="kal-btn-ghost min-h-[48px] flex-1 text-center">
            All guides
          </Link>
        </div>
      </article>
    </>
  );
}
