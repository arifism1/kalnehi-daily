import Link from "next/link";
import { CTABanner } from "@/components/marketing/CTABanner";
import { ExamHero } from "@/components/marketing/ExamHero";
import { FAQBlock } from "@/components/marketing/FAQBlock";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/ssc-chsl",
  title: `Daily Planner for SSC CHSL Preparation | ${SITE_NAME}`,
  description: `SSC CHSL is the entry point to Central Government clerical jobs. Kalnehi Daily tracks your 4-section daily practice, logs mock scores, and uses Mastermind to identify what to fix before the next test.`,
});

const FAQS = [
  { question: "What is the SSC CHSL exam structure?", answer: "SSC CHSL Tier 1: 4 sections × 25 questions (100 marks, 60 minutes). Same sections as CGL — QA, Reasoning, English, General Awareness. Tier 2: Descriptive paper (100 marks, 60 minutes) — essay writing and letter writing. Tier 3: Skill Test / Typing Test." },
  { question: "Is SSC CHSL easier than SSC CGL?", answer: "SSC CHSL's Tier 1 is similar in pattern to CGL Tier 1. The key difference is the level of questions (CHSL tends to be slightly easier) and that CHSL has a descriptive Tier 2 instead of a Tier 2 objective paper. Preparation for both overlaps significantly." },
  { question: "How does Kalnehi Daily help SSC CHSL aspirants?", answer: "Track your daily mock test completion, section-wise practice hours, and GA revision as a daily habit. Mastermind analyses your mock scores and tells you which section needs the most work before your CHSL exam date." },
  { question: "How much time does SSC CHSL preparation take?", answer: "Candidates typically need 4-6 months of focused preparation. Many SSC CHSL aspirants prepare simultaneously for CGL and CHSL — the overlap in syllabus is significant and Kalnehi Daily tracks both in one place." },
];

export default function SscChslPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "SSC CHSL Preparation", path: "/ssc-chsl" }]}
        faqs={FAQS}
      />

      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "SSC CHSL Preparation", path: "/ssc-chsl" }]} className="mb-2" />
      <article className="space-y-10">
        <ExamHero
          badge="SSC CHSL — Combined Higher Secondary Level"
          headline="SSC CHSL Preparation Daily Planner — Daily Practice Beats Last-Minute Cramming Every Time"
          subheadline="SSC CHSL selects for Central Government jobs at LDC, DEO and JSA levels. The candidates who clear it practice daily, track their General Awareness rigorously, and analyse every mock test they write."
        />

        <section className="space-y-3" aria-labelledby="chsl-how">
          <h2 id="chsl-how" className="text-xl font-semibold text-kal-text">How Kalnehi Daily helps SSC CHSL preparation</h2>
          <ul className="space-y-3 text-sm">
            {[
              { t: "Daily mock test tracking", d: "Log your Tier 1 mock scores section-wise. Mastermind tracks your accuracy trend across mocks and tells you which section is most improvable in the time you have left." },
              { t: "General Awareness daily habit", d: "GA is the section most students ignore until the last month. Set up a daily GA revision habit in Kalnehi Daily — 20 minutes of static GK + current affairs — and track the streak." },
              { t: "Descriptive writing practice (Tier 2)", d: "SSC CHSL Tier 2 requires essay and letter writing. Log your daily writing practice sessions and track how many essays you've written this week." },
            ].map(({ t, d }) => (
              <div key={t} className="kal-glass-card rounded-xl p-4">
                <strong className="text-kal-text block mb-1">{t}</strong>
                <p className="text-kal-text-secondary">{d}</p>
              </div>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-kal-text">Related pages</h2>
          <ul className="space-y-1 text-sm">
            <li><Link href="/ssc-cgl" className="font-medium text-kal-accent-dark hover:underline">SSC CGL preparation →</Link></li>
            <li><Link href="/ibps-po" className="font-medium text-kal-accent-dark hover:underline">IBPS PO preparation →</Link></li>
          </ul>
        </section>

        <FAQBlock items={FAQS} />
        <CTABanner headline="Build your SSC CHSL prep system" subtext="7 days free. Mastermind. No credit card." />
      </article>
    </>
  );
}
