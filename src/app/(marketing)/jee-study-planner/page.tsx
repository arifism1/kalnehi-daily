import Link from "next/link";

import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";

export const metadata = marketingPageMetadata({
  path: "/jee-study-planner",
  title: "JEE study planner app — daily execution for JEE Main & Advanced | Kalnehi Daily",
  description:
    "Turn IIT-JEE prep into a repeatable daily system: weekly planner, syllabus-weighted tasks, timed study sessions, and habits. Kalnehi Daily is an installable PWA for serious JEE aspirants in India.",
});

export default function JeeStudyPlannerPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "JEE study planner", path: "/jee-study-planner" },
        ]}
        faqs={[
          {
            question: "How is Kalnehi Daily different from a generic to-do app for JEE?",
            answer:
              "Kalnehi Daily is built around exam execution: syllabus-linked progress, weighted marks thinking, study sessions, and routines aligned to a target exam date — not just unchecked boxes.",
          },
          {
            question: "Does Kalnehi Daily cover JEE Main and Advanced together?",
            answer:
              "You configure your target exam profile inside the app and plan daily work accordingly. Use the planner and syllabus modules to reflect your current stage — dropper, class 12, or parallel Boards.",
          },
          {
            question: "Can I use Kalnehi Daily offline?",
            answer:
              "After visiting while online, the PWA caches key assets and pages you have opened for offline-friendly access — ideal for unstable hostel Wi‑Fi. You still need connectivity for sync and AI features.",
          },
          {
            question: "Is there an AI coach for JEE?",
            answer:
              "PrepBrain AI is available on paid plans. It is designed to respect your syllabus and planner context — upgrade only if you want that layer.",
          },
        ]}
      />
      <article className="space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-kal-accent">
            JEE preparation
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            JEE study planner that respects Physics, Chemistry & Mathematics together
          </h1>
          <p className="text-sm leading-relaxed text-kal-text-secondary sm:text-base">
            The IIT-JEE race rewards consistency more than bursts. Kalnehi Daily helps you translate a
            two-year (or drop-year) goal into <strong className="text-kal-text">what to ship today</strong>
            : tasks tied to syllabus weightage, time on task, and streaks that survive bad weeks.
          </p>
        </header>

        <section className="space-y-3" aria-labelledby="jee-why">
          <h2 id="jee-why" className="text-lg font-semibold text-kal-text">
            Why “just study harder” fails
          </h2>
          <p className="text-sm leading-relaxed text-kal-text-secondary">
            Most students know <em>what</em> to study. The gap is execution under fatigue: inconsistent
            revision, skipped drills, and no honest link between hours spent and marks outcomes.
            Kalnehi Daily pushes you toward measurable daily output — minutes in study sessions,
            syllabus coverage you can defend in mocks, and habits that keep you in the chair when
            motivation dips.
          </p>
        </section>

        <section className="space-y-3" aria-labelledby="jee-how">
          <h2 id="jee-how" className="text-lg font-semibold text-kal-text">
            How Kalnehi Daily supports JEE prep
          </h2>
          <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-kal-text-secondary">
            <li>
              <strong className="text-kal-text">Weekly planner:</strong> allocate subjects and priorities
              so each day has a lane — not an endless backlog.
            </li>
            <li>
              <strong className="text-kal-text">Study sessions:</strong> time-box problem solving and
              theory so distraction does not eat your night.
            </li>
            <li>
              <strong className="text-kal-text">Syllabus & progress:</strong> connect microtopics to
              tasks so you see whether your effort matches exam scope.
            </li>
            <li>
              <strong className="text-kal-text">Habits:</strong> lock non-negotiables (revision cards,
              formula sheets, mock review) into streaks you can trust.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border border-kal-border bg-kal-accent-soft/40 px-4 py-5" aria-labelledby="jee-pwa">
          <h2 id="jee-pwa" className="text-lg font-semibold text-kal-text">
            Install as a PWA on Android
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-kal-text-secondary">
            Open Kalnehi Daily in Chrome, sign in, then install to your home screen for a focused,
            app-like shell — fewer tabs, less context switching between coaching PDFs and your plan.
          </p>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/auth"
            className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-kal-accent px-6 text-sm font-bold text-kal-accent-foreground"
          >
            Start planning with Kalnehi Daily
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
