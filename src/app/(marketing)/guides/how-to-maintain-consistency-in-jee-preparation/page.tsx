import Link from "next/link";

import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/guides/how-to-maintain-consistency-in-jee-preparation",
  title: `How to Maintain Consistency in JEE Preparation (2026) — practical guide | ${SITE_NAME}`,
  description: `Actionable guide: weekly rhythm, mistake review, sleep, and honest daily plans for JEE Main & Advanced 2026. Use ${SITE_NAME}'s planner, sessions & habits to ship consistent study days.`,
});

export default function JeeConsistencyGuidePage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          {
            name: "Consistency in JEE preparation",
            path: "/guides/how-to-maintain-consistency-in-jee-preparation",
          },
        ]}
        faqs={[
          {
            question: "What is the smallest habit that improves JEE consistency?",
            answer:
              "A fixed wake-up and first study block — even 90 minutes — that you protect four to five days a week. Momentum beats motivation.",
          },
          {
            question: "How do I recover after a bad mock?",
            answer:
              "Schedule error review before new content. One honest review block beats three chapters of passive reading.",
          },
          {
            question: `Can ${SITE_NAME} help track consistency?`,
            answer:
              "Yes — weekly planner, daily todos, study sessions, and habit streaks are designed for visible execution, not vague goals.",
          },
        ]}
      />
      <article className="space-y-6 text-sm leading-relaxed text-kal-text-secondary">
        <p className="text-xs font-semibold uppercase tracking-wide text-kal-accent">
          Blog-style guide · JEE 2026
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-kal-text sm:text-3xl">
          How to maintain consistency in JEE preparation
        </h1>
        <p className="text-base text-kal-text-secondary">
          Consistency is not inspiration — it is a{" "}
          <strong className="text-kal-text">system you can restart after a bad day</strong>. Here is a
          practical loop that works with {`${SITE_NAME}'s`} planner and timers.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-kal-text">1. Plan in weeks, execute in days</h2>
          <p>
            Pick three “must ship” outcomes per week — e.g., Mechanics mixed problems, Organic named
            reactions, Inorganic revision deck. Break them into daily todos. If a day collapses, move
            work, don’t delete the week.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-kal-text">2. Protect deep work with timers</h2>
          <p>
            Use 50–90 minute study sessions with a single task label. Close unrelated tabs before you
            start — context switching is the hidden marks thief in JEE prep.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-kal-text">3. Review mistakes before new theory</h2>
          <p>
            After every mock or problem set, schedule a short block for wrong questions only. No new
            chapter until yesterday’s leaks are tagged.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-kal-text">4. Sleep and recovery are part of the syllabus</h2>
          <p>
            Brain Yoga-style micro-breaks between blocks help, but they do not replace sleep. If your
            plan needs all-nighters weekly, the plan is wrong — tighten scope, not hours.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-kal-text">5. Use one execution app</h2>
          <p>
            Fragmented notes across five apps hide the truth.{" "}
            <Link href="/jee-study-planner" className="font-medium text-kal-accent-dark underline-offset-2 hover:underline">
              {`${SITE_NAME}'s`} JEE 2026 planner
            </Link>{" "}
            keeps weekly intent, daily tasks, and habits in one installable PWA — fewer tabs, clearer
            output.
          </p>
        </section>

        <hr className="my-8 border-kal-border" />

        <p className="text-sm">
          <Link href="/guides" className="font-medium text-kal-accent-dark hover:underline">
            ← Back to guides
          </Link>
          {" · "}
          <Link href="/auth" className="font-medium text-kal-accent-dark hover:underline">
            Get started
          </Link>
        </p>
      </article>
    </>
  );
}
