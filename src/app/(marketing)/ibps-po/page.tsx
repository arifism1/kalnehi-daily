import Link from "next/link";
import { CTABanner } from "@/components/marketing/CTABanner";
import { ExamHero } from "@/components/marketing/ExamHero";
import { FAQBlock } from "@/components/marketing/FAQBlock";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/ibps-po",
  title: `Daily Planner for IBPS PO Preparation | ${SITE_NAME}`,
  description: `IBPS PO covers Quantitative Aptitude, Reasoning, English, General Awareness and Computer Knowledge. Kalnehi tracks your daily practice and Mastermind tells you where your score is leaking.`,
});

const FAQS = [
  { question: "What is the IBPS PO exam structure?", answer: "IBPS PO Preliminary: 3 sections (English, Quantitative Aptitude, Reasoning) — 100 questions, 60 minutes. IBPS PO Main: 4 sections (Reasoning + Computer, English, Data Analysis, General Economy & Banking Awareness) + Descriptive paper (Letter + Essay). Interview: 100 marks." },
  { question: "How does Kalnehi help IBPS PO aspirants?", answer: "Track your preliminary and mains preparation separately in Kalnehi. Log daily mock tests, practise sections, and General Awareness revision. Mastermind identifies your weakest section across 5 areas and tells you how to reallocate study time before your next mock." },
  { question: "How many months does IBPS PO preparation take?", answer: "Candidates typically prepare for 4-6 months before IBPS PO. Those preparing for multiple bank exams (SBI PO + IBPS PO + RRB PO) benefit from a unified tracker — Kalnehi manages all three in one place." },
  { question: "What is the difference between IBPS PO and SBI PO?", answer: "SBI PO is slightly more competitive (better pay, brand, and more applicants). The syllabuses are similar but SBI PO has a different descriptive test format. Many aspirants prepare for both simultaneously — Kalnehi tracks both timelines and exam dates." },
];

export default function IbpsPoPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "IBPS PO Preparation", path: "/ibps-po" }]}
        faqs={FAQS}
      />

      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "IBPS PO Preparation", path: "/ibps-po" }]} className="mb-2" />
      <article className="space-y-10">
        <ExamHero
          badge="IBPS PO — Probationary Officer"
          headline="IBPS PO Preparation Daily Planner — Consistent Mock Practice Decides Your Final Score"
          subheadline="IBPS PO is India's largest banking recruitment exam. Your score relative to other candidates matters — which means you need to practise more mocks and analyse them more carefully than everyone else. Kalnehi tracks that process."
        />

        <section className="space-y-4" aria-labelledby="ibps-sections">
          <h2 id="ibps-sections" className="text-xl font-bold text-kal-text">IBPS PO sections tracked in Kalnehi</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { s: "Quantitative Aptitude", topics: ["Simplification, Number Series", "Data Interpretation (Tables, Charts)", "Time-Work, Speed-Distance, Profit-Loss", "Probability, Permutation & Combination"] },
              { s: "Reasoning", topics: ["Seating Arrangement, Puzzles", "Coding-Decoding, Blood Relations", "Syllogism, Input-Output", "Critical Reasoning, Data Sufficiency"] },
              { s: "English Language", topics: ["Reading Comprehension", "Cloze Test, Para Jumbles", "Error Detection, Sentence Correction", "Vocabulary — Synonyms, Antonyms"] },
              { s: "General Awareness (Banking)", topics: ["Banking Awareness — RBI, SEBI, NABARD", "Financial Terminology", "Current Affairs (Banking + Economy)", "Government Schemes, Insurance"] },
            ].map(({ s, topics }) => (
              <div key={s} className="kal-glass-card rounded-xl p-4 space-y-1.5">
                <h3 className="text-xs font-bold text-kal-accent-dark">{s}</h3>
                <ul className="space-y-0.5">{topics.map(t => <li key={t} className="text-xs text-kal-text-secondary">· {t}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-kal-text">Related pages</h2>
          <ul className="space-y-1 text-sm">
            <li><Link href="/sbi-po" className="font-medium text-kal-accent-dark hover:underline">SBI PO preparation →</Link></li>
            <li><Link href="/features/marks-engine" className="font-medium text-kal-accent-dark hover:underline">Marks Engine — track sectional scores →</Link></li>
          </ul>
        </section>

        <FAQBlock items={FAQS} />
        <CTABanner headline="Build your IBPS PO prep system" subtext="3 days free. Mastermind. No credit card." />
      </article>
    </>
  );
}
