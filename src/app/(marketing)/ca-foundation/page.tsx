import Link from "next/link";
import { CTABanner } from "@/components/marketing/CTABanner";
import { ExamHero } from "@/components/marketing/ExamHero";
import { FAQBlock } from "@/components/marketing/FAQBlock";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/ca-foundation",
  title: `Daily Planner for CA Foundation Preparation | ${SITE_NAME}`,
  description: `CA Foundation has 4 papers — Accounts, Law, Maths and Economics. Kalnehi Daily tracks your paper-wise syllabus, helps you plan daily study hours, and uses Mastermind to identify your score gaps.`,
});

const FAQS = [
  { question: "What are the 4 papers in CA Foundation?", answer: "CA Foundation has Paper 1 (Principles and Practice of Accounting), Paper 2 (Business Laws and Business Correspondence), Paper 3 (Business Mathematics and Logical Reasoning & Statistics), and Paper 4 (Business Economics and Business and Commercial Knowledge). Papers 1 and 2 are descriptive; Papers 3 and 4 are objective." },
  { question: "How many hours should a CA Foundation student study per day?", answer: "Most CA Foundation toppers study 6-8 hours per day for 4-5 months. The key is consistency across all 4 papers — not spending all your time on Accounts because you enjoy it." },
  { question: "How does Kalnehi Daily track CA Foundation paper-wise progress?", answer: "Set up each paper as a subject in Kalnehi Daily's syllabus tracker. Track chapters within each paper at the topic level. Mastermind monitors which paper is most behind and tells you how many hours to shift to close the gap before your exam date." },
  { question: "Is CA Foundation hard to clear in the first attempt?", answer: "The pass rate for CA Foundation hovers around 30-40%. Most candidates fail due to under-preparation in 1-2 papers. Kalnehi Daily's syllabus tracker ensures you never lose visibility on any paper — so you don't discover gaps on exam day." },
];

export default function CaFoundationPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "CA Foundation Preparation", path: "/ca-foundation" }]}
        faqs={FAQS}
      />

      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "CA Foundation Preparation", path: "/ca-foundation" }]} className="mb-2" />
      <article className="space-y-10">
        <ExamHero
          badge="CA Foundation — ICAI"
          headline="CA Foundation Preparation Daily Planner — 4 Papers, One System"
          subheadline="CA Foundation is where most aspiring CAs begin — and where many stumble because they under-prepare one paper while over-investing in another. Kalnehi Daily keeps all 4 papers visible and on track."
        />

        <section className="space-y-4" aria-labelledby="cafound-papers">
          <h2 id="cafound-papers" className="text-xl font-semibold text-kal-text">CA Foundation papers tracked in Kalnehi Daily</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { paper: "Paper 1: Accounts", topics: ["Basic Accounting Concepts", "Journal, Ledger, Trial Balance", "Financial Statements", "Partnership Accounts", "Company Accounts"] },
              { paper: "Paper 2: Business Laws", topics: ["Indian Contract Act", "Sale of Goods Act", "Partnership Act", "Companies Act Basics", "Business Correspondence"] },
              { paper: "Paper 3: Maths + Stats", topics: ["Ratio & Proportion, Indices", "Equations and Inequalities", "Time Value of Money", "Permutations & Combinations", "Statistics and Probability"] },
              { paper: "Paper 4: Economics", topics: ["Introduction to Economics", "Theory of Demand & Supply", "Production & Cost Theory", "Price Determination", "Business & Commercial Knowledge"] },
            ].map(({ paper, topics }) => (
              <div key={paper} className="kal-glass-card rounded-xl p-4 space-y-1.5">
                <h3 className="text-xs font-semibold text-kal-accent-dark">{paper}</h3>
                <ul className="space-y-0.5">{topics.map(t => <li key={t} className="text-xs text-kal-text-secondary">· {t}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3" aria-labelledby="cafound-mastermind">
          <h2 id="cafound-mastermind" className="text-xl font-semibold text-kal-text">How Mastermind helps CA Foundation students</h2>
          <p className="text-sm text-kal-text-secondary">Mastermind tracks your ICAI mock scores and tells you which paper is pulling your aggregate down. It also flags when you're spending too many hours on Paper 1 (Accounts) while Paper 3 (Maths) is neglected — a common mistake that causes Foundation failures.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-kal-text">Related pages</h2>
          <ul className="space-y-1 text-sm">
            <li><Link href="/ca-intermediate" className="font-medium text-kal-accent-dark hover:underline">CA Intermediate Preparation →</Link></li>
            <li><Link href="/blog/ca-intermediate-daily-routine" className="font-medium text-kal-accent-dark hover:underline">Daily routine CA toppers follow →</Link></li>
          </ul>
        </section>

        <FAQBlock items={FAQS} />
        <CTABanner headline="Track all 4 CA Foundation papers in one place" subtext="7 days free. Mastermind. No credit card." />
      </article>
    </>
  );
}
