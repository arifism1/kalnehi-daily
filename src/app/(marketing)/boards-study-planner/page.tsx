import Link from "next/link";

import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/boards-study-planner",
  title: `Board exam planner — school tests & competitive prep together | ${SITE_NAME}`,
  description: `Plan Board exam months without dropping daily discipline. ${SITE_NAME} combines routines, todos, and study sessions so Class 10–12 students can execute school and entrance prep in one PWA.`,
});

export default function BoardsStudyPlannerPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "Board exam planner", path: "/boards-study-planner" },
        ]}
        faqs={[
          {
            question: `Is ${SITE_NAME} only for JEE and NEET?`,
            answer:
              "No. Many students use it for Board-focused schedules while keeping optional competitive prep in the same weekly map — routines and todos adapt to your subjects.",
          },
          {
            question: "How do I avoid burnout during Board month?",
            answer:
              `Use realistic daily plans, timed study sessions, and short recovery breaks. ${SITE_NAME} emphasizes sustainable output — not heroic all-nighters that collapse the next day.`,
          },
          {
            question: `Can parents or schools use ${SITE_NAME}?`,
            answer:
              "It is built for students. Accounts are personal; visibility of progress stays with the signed-in user.",
          },
          {
            question: "Where do I install the app?",
            answer:
              "Use Chrome on Android or desktop: sign in, then install from the browser menu when prompted for the best full-screen experience.",
          },
        ]}
      />
      <article className="space-y-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-kal-accent">
            Board exams
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Board exam planner when school, homework, and entrance prep compete
          </h1>
          <p className="text-sm leading-relaxed text-kal-text-secondary sm:text-base">
            Boards reward clarity and completeness. {SITE_NAME} helps you{" "}
            <strong className="text-kal-text">allocate limited hours honestly</strong>: school
            assignments, revision, and mock-style practice — without pretending you can do everything
            every day.
          </p>
        </header>

        <section className="space-y-3" aria-labelledby="boards-approach">
          <h2 id="boards-approach" className="text-lg font-semibold text-kal-text">
            A practical weekly rhythm
          </h2>
          <p className="text-sm leading-relaxed text-kal-text-secondary">
            Map subjects across the week, then break each day into timed sessions. When school events or
            tests disrupt the plan, adjust in the planner instead of abandoning the system — the goal is
            a loop you can return to, not a perfect calendar.
          </p>
        </section>

        <section className="space-y-3" aria-labelledby="boards-features">
          <h2 id="boards-features" className="text-lg font-semibold text-kal-text">
            Features students rely on
          </h2>
          <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-kal-text-secondary">
            <li>
              <strong className="text-kal-text">Todos & planner:</strong> capture school deadlines beside
              entrance tasks so neither silently slips.
            </li>
            <li>
              <strong className="text-kal-text">Timer & sessions:</strong> keep phone distraction lower
              during self-study blocks.
            </li>
            <li>
              <strong className="text-kal-text">Meditation & recovery:</strong> short resets between
              heavy subjects — useful during exam weeks.
            </li>
          </ul>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/auth" className="kal-btn-accent min-h-[48px] flex-1 text-center">
            Open {SITE_NAME}
          </Link>
          <Link href="/guides" className="kal-btn-ghost min-h-[48px] flex-1 text-center">
            More guides
          </Link>
        </div>
      </article>
    </>
  );
}
