import Link from "next/link";

import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";

export const metadata = marketingPageMetadata({
  path: "/neet-study-planner",
  title: "NEET study planner — PCB revision & daily output for NEET-UG | Kalnehi Daily",
  description:
    "Plan PCB theory, drills, and mock analysis with Kalnehi Daily: weekly planner, syllabus tracking, study sessions, and habits. Install the PWA and stay consistent for NEET-UG.",
});

export default function NeetStudyPlannerPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "NEET study planner", path: "/neet-study-planner" },
        ]}
        faqs={[
          {
            question: "Can Kalnehi Daily handle Biology-heavy schedules?",
            answer:
              "Yes. Use the weekly planner and daily plan to split theory, recall, and question banks across PCB. Study sessions help you protect deep work for long Biology chapters.",
          },
          {
            question: "How do I balance NEET with Board exams?",
            answer:
              "Use routines and todos to reserve fixed Board blocks while keeping NEET drills non-negotiable in your weekly map — the app is designed for overlapping pressure.",
          },
          {
            question: "Will I get reminders?",
            answer:
              "The app supports notifications when configured. Pair nudges with habits so reminders reinforce actions you already committed to — not random guilt.",
          },
          {
            question: "What is PrepBrain AI?",
            answer:
              "An optional syllabus-aware assistant on paid tiers. It is not a replacement for NCERT and coaching — use it to unblock concepts and structure revision.",
          },
        ]}
      />
      <article className="space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-kal-accent">
            NEET-UG
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            NEET study planner for PCB volume without losing your day
          </h1>
          <p className="text-sm leading-relaxed text-kal-text-secondary sm:text-base">
            NEET rewards recall under time pressure. Kalnehi Daily focuses on{" "}
            <strong className="text-kal-text">throughput you can repeat</strong>: daily tasks, session
            timers, and syllabus-linked progress so you know whether you are covering the exam — not
            just reading comfortably.
          </p>
        </header>

        <section className="space-y-3" aria-labelledby="neet-mistakes">
          <h2 id="neet-mistakes" className="text-lg font-semibold text-kal-text">
            Common NEET prep mistakes
          </h2>
          <p className="text-sm leading-relaxed text-kal-text-secondary">
            Passive video hours, endless new chapters, and zero mock review loops create fake progress.
            The fix is structured output: each day should have clear drills, timed practice, and a honest
            link to previous mistakes. Kalnehi Daily makes that output visible — not buried in notebooks.
          </p>
        </section>

        <section className="space-y-3" aria-labelledby="neet-stack">
          <h2 id="neet-stack" className="text-lg font-semibold text-kal-text">
            What you use inside Kalnehi Daily
          </h2>
          <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-kal-text-secondary">
            <li>
              <strong className="text-kal-text">Daily & weekly planning:</strong> protect Biology
              reading blocks and Chemistry drills without abandoning Physics numericals.
            </li>
            <li>
              <strong className="text-kal-text">Syllabus tracker:</strong> see weight and completion
              so you do not hide weak chapters until the last month.
            </li>
            <li>
              <strong className="text-kal-text">Habits & streaks:</strong> stack micro-behaviours —
              formula recall, flashcards, previous-year questions — that compound.
            </li>
          </ul>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/auth"
            className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl bg-kal-accent px-6 text-sm font-bold text-kal-accent-foreground"
          >
            Create your NEET plan
          </Link>
          <Link
            href="/guides"
            className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-xl border border-kal-border bg-kal-card px-6 text-sm font-semibold text-kal-text"
          >
            Back to guides
          </Link>
        </div>
      </article>
    </>
  );
}
