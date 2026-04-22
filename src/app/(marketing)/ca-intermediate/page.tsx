import Link from "next/link";
import { CTABanner } from "@/components/marketing/CTABanner";
import { ExamHero } from "@/components/marketing/ExamHero";
import { FAQBlock } from "@/components/marketing/FAQBlock";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/ca-intermediate",
  title: `Daily Planner for CA Intermediate Preparation | ${SITE_NAME}`,
  description: `CA Intermediate has 8 papers across 2 groups. PrepBrain AI tracks your ICAI mock scores and tells you which Accounts topics are pulling your aggregate down. Start free.`,
});

const FAQS = [
  { question: "Should I attempt CA Intermediate Group 1 and Group 2 together or separately?", answer: "Both strategies work, but doing both groups together requires more preparation bandwidth. Kalnehi helps you track 8 paper syllabuses simultaneously and PrepBrain tells you if you're stretching too thin across groups — a data-driven answer to this common question." },
  { question: "How does PrepBrain AI help CA Intermediate students?", answer: "PrepBrain tracks your ICAI mock scores paper by paper and identifies which subjects are consistently pulling your aggregate below 50%. It tells you how many focused hours each weak paper needs to recover before your group exam date." },
  { question: "What is the CA Intermediate exam structure?", answer: "CA Intermediate has 8 papers in 2 groups of 4. Group 1: Accounting, Corporate Laws, Cost and Management Accounting, Taxation. Group 2: Advanced Accounting, Auditing, EIS & SM, Financial Management & Economics for Finance. Each paper is 100 marks." },
  { question: "How many hours per day should a CA Intermediate student study?", answer: "8-10 hours per day during an articleship-free preparation period. If you're in articleship, 4-6 focused hours daily is realistic. The consistency of those hours matters more than occasional 14-hour marathon days." },
];

export default function CaIntermediatePage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "CA Intermediate Preparation", path: "/ca-intermediate" }]}
        faqs={FAQS}
      />

      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "CA Intermediate Preparation", path: "/ca-intermediate" }]} className="mb-2" />
      <article className="space-y-10">
        <ExamHero
          badge="CA Intermediate — ICAI"
          headline="CA Intermediate Preparation Daily Planner — 8 Papers, 2 Groups, Zero Gaps"
          subheadline="CA Intermediate is the hardest CA exam for most students — 8 papers, complex content, and the pressure of articleship running alongside prep. Kalnehi tracks all 8 papers so nothing gets neglected."
          stats={[{ value: "8 papers", label: "across 2 groups" }, { value: "~25% pass rate", label: "both groups attempt" }]}
        />

        <section className="space-y-4" aria-labelledby="caint-papers">
          <h2 id="caint-papers" className="text-xl font-bold text-kal-text">CA Intermediate papers mapped in Kalnehi</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { group: "Group 1", papers: ["Paper 1: Accounting", "Paper 2: Corporate & Other Laws", "Paper 3: Cost & Management Accounting", "Paper 4: Taxation (IT + GST)"] },
              { group: "Group 2", papers: ["Paper 5: Advanced Accounting", "Paper 6: Auditing & Assurance", "Paper 7: EIS & Strategic Management", "Paper 8: FM & Economics for Finance"] },
            ].map(({ group, papers }) => (
              <div key={group} className="kal-glass-card rounded-xl p-4 space-y-1.5">
                <h3 className="text-xs font-bold text-kal-accent-dark">{group}</h3>
                <ul className="space-y-0.5">{papers.map(p => <li key={p} className="text-xs text-kal-text-secondary">· {p}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3" aria-labelledby="caint-prepbrain">
          <h2 id="caint-prepbrain" className="text-xl font-bold text-kal-text">PrepBrain AI for CA Intermediate</h2>
          <p className="text-sm text-kal-text-secondary leading-relaxed">PrepBrain tracks your ICAI mock scores paper by paper and tells you which Accounting or Audit topics are pulling your aggregate down. It also monitors whether you're spending proportional time across both groups — the #1 mistake that causes Group 2 failures among students who focused all attention on Group 1.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-kal-text">Related pages</h2>
          <ul className="space-y-1 text-sm">
            <li><Link href="/ca-foundation" className="font-medium text-kal-accent-dark hover:underline">CA Foundation Preparation →</Link></li>
            <li><Link href="/ca-final" className="font-medium text-kal-accent-dark hover:underline">CA Final Preparation →</Link></li>
            <li><Link href="/blog/ca-intermediate-daily-routine" className="font-medium text-kal-accent-dark hover:underline">Daily routine CA Intermediate toppers follow →</Link></li>
          </ul>
        </section>

        <FAQBlock items={FAQS} />
        <CTABanner headline="Track all 8 CA Intermediate papers in one place" subtext="3 days free. PrepBrain AI. No credit card." />
      </article>
    </>
  );
}
