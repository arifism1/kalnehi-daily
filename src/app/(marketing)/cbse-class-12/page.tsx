import Link from "next/link";
import { CTABanner } from "@/components/marketing/CTABanner";
import { ExamHero } from "@/components/marketing/ExamHero";
import { FAQBlock } from "@/components/marketing/FAQBlock";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/cbse-class-12",
  title: `Daily Planner for CBSE Class 12 Board Preparation | ${SITE_NAME}`,
  description: `Class 12 Boards determine college admissions, CUET eligibility and confidence. Kalnehi helps you balance Boards prep with JEE/NEET/CUET preparation without burning out.`,
});

const FAQS = [
  { question: "How do I balance Class 12 Boards with JEE/NEET simultaneously?", answer: "The key is to treat Boards and entrance prep as complementary, not competing. NCERT forms the base for both. Kalnehi lets you set up separate syllabuses for Boards and your entrance exam, and plan daily time blocks for each. Mastermind monitors if either is getting neglected." },
  { question: "What percentage is needed in Class 12 for college admissions?", answer: "For NIT admission via JEE Main, you need 75% in Class 12 (60% for reserved categories). For DU courses, 90-95% is needed for competitive streams. CUET has replaced marks cutoffs for Central Universities, but Boards percentage still matters for many colleges." },
  { question: "How does Kalnehi help Class 12 students manage time?", answer: "Kalnehi's daily planner helps you allocate specific time blocks each day for each subject — Physics, Chemistry, Maths for science stream; or Economics, Accountancy, Business Studies for commerce. You track completion daily so nothing accumulates into an overwhelming backlog." },
  { question: "Should I follow a fixed timetable for Class 12 Boards?", answer: "A fixed timetable often breaks by week 3. Kalnehi uses a flexible system — you plan each day the evening before, logging what you'll study, then mark completion. This is more sustainable over 6-8 months of Board prep than a rigid schedule." },
];

export default function CbseClass12Page() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "CBSE Class 12 Preparation", path: "/cbse-class-12" }]}
        faqs={FAQS}
      />

      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "CBSE Class 12 Preparation", path: "/cbse-class-12" }]} className="mb-2" />
      <article className="space-y-10">
        <ExamHero
          badge="CBSE Class 12 Boards"
          headline="CBSE Class 12 Board Preparation Daily Planner — Build Consistency Across Every Subject"
          subheadline="Class 12 Boards are the foundation — for JEE eligibility, CUET admissions, college cutoffs, and your own confidence. Get them right alongside your entrance exam prep without burning out."
        />

        <section className="space-y-3" aria-labelledby="cbse12-system">
          <h2 id="cbse12-system" className="text-xl font-bold text-kal-text">How Kalnehi helps Class 12 Board students</h2>
          <ul className="space-y-3 text-sm">
            {[
              { t: "Subject-wise syllabus tracker", d: "Track chapters across Physics, Chemistry, Maths (or Biology) at the topic level. Mark NCERT chapters as done and flag chapters that need revision. Mastermind monitors your completion per subject." },
              { t: "Boards + entrance prep balance", d: "Set up separate exam goals for Boards and your entrance exam. Kalnehi's daily planner lets you allocate specific time for each. Mastermind monitors the balance and flags when entrance prep is eating into Boards time." },
              { t: "Exam countdown", d: "Track exactly how many days until your Board exams start. Mastermind uses this to plan backward — telling you how many chapters to cover per week to finish the syllabus before revision month." },
              { t: "Previous year paper practice tracking", d: "CBSE rewards students who practise previous year question papers. Log your PYQ practice sessions as daily tasks in Kalnehi and track which subjects still need paper practice." },
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
            <li><Link href="/jee" className="font-medium text-kal-accent-dark hover:underline">JEE Main & Advanced preparation →</Link></li>
            <li><Link href="/cuet" className="font-medium text-kal-accent-dark hover:underline">CUET preparation →</Link></li>
            <li><Link href="/blog/class-12-boards-jee-neet-balance" className="font-medium text-kal-accent-dark hover:underline">How to prepare for Boards and JEE/NEET simultaneously →</Link></li>
          </ul>
        </section>

        <FAQBlock items={FAQS} />
        <CTABanner headline="Build your Class 12 Board prep system" subtext="3 days free. Mastermind. No credit card." />
      </article>
    </>
  );
}
