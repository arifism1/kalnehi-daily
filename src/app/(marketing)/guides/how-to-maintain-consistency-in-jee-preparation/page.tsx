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
              "Go through your wrong questions before you open anything new. One honest review session is worth more than three chapters of passive reading.",
          },
          {
            question: `Can ${SITE_NAME} help track consistency?`,
            answer:
              "Yes — weekly planner, daily todos, study sessions, and habit streaks are all there so you can see exactly where you stand, not just feel like you're busy.",
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
          Consistency isn&apos;t about motivation — it&apos;s about having a{" "}
          <strong className="text-kal-text">system you can restart after a bad day</strong>. Here&apos;s a
          practical loop that pairs well with {`${SITE_NAME}'s`} planner and timers.
        </p>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-kal-text">1. Plan in weeks, execute in days</h2>
          <p>
            Pick three things you want to get done by the end of the week — say, Mechanics mixed
            problems, Organic named reactions, and an Inorganic revision pass. Break those down into
            daily tasks. If a day goes off the rails, carry the work forward. Don&apos;t scrap the
            whole week over it.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-kal-text">2. Protect your deep work with timers</h2>
          <p>
            Work in 50–90 minute blocks with one task to focus on. Close unrelated tabs before you
            start — bouncing between topics quietly costs you a lot of marks in JEE prep, more than
            most people notice.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-kal-text">3. Review mistakes before moving on</h2>
          <p>
            After every mock or problem set, go back to your wrong answers first. Don&apos;t open a
            new chapter until you&apos;ve actually understood what went wrong the last time.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-kal-text">4. Sleep and recovery are part of the plan</h2>
          <p>
            Short breaks between study blocks help — but they don&apos;t replace sleep. If your
            schedule only works with regular all-nighters, the plan needs adjusting. Cut scope, not
            sleep.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-kal-text">5. Keep everything in one place</h2>
          <p>
            Spreading notes and tasks across multiple apps makes it easy to lose sight of where you
            actually stand.{" "}
            <Link href="/jee-study-planner" className="font-medium text-kal-accent-dark underline-offset-2 hover:underline">
              {`${SITE_NAME}'s`} JEE 2026 planner
            </Link>{" "}
            keeps your weekly goals, daily tasks, and habits together in one installable app — so
            you always know what to do next.
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
