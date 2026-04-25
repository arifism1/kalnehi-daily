import Link from "next/link";
import { CTABanner } from "@/components/marketing/CTABanner";
import { ExamHero } from "@/components/marketing/ExamHero";
import { FAQBlock } from "@/components/marketing/FAQBlock";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/sbi-po",
  title: `Daily Planner for SBI PO Preparation | ${SITE_NAME}`,
  description: `SBI PO is one of India's most coveted banking jobs. Kalnehi tracks your preliminary and mains preparation, logs daily mock scores, and helps Mastermind optimise your sectional strategy.`,
});

const FAQS = [
  { question: "What is the SBI PO exam structure?", answer: "SBI PO Preliminary: 3 sections (English, QA, Reasoning) — 100 questions, 60 minutes. SBI PO Main: 4 sections (Data Analysis & Interpretation, Reasoning & Computer, English, General/Economy/Banking Awareness) + Descriptive Paper (Letter + Essay, 50 marks, 30 minutes). Group Exercise + Interview: 50 marks." },
  { question: "Why is SBI PO harder than IBPS PO?", answer: "SBI PO has higher competition (25+ lakh applicants for ~2000 seats), more difficult mains paper, a group discussion round, and interview. The cutoffs are also generally higher. However, the preparation strategies are similar and Kalnehi supports both." },
  { question: "How does Kalnehi help SBI PO aspirants?", answer: "Kalnehi tracks your prelims and mains preparation separately. Log daily mock tests across all sections. Mastermind identifies which section is your weakest based on mock history and tells you how many focused hours that section needs before your exam date." },
  { question: "Can I prepare for SBI PO and IBPS PO at the same time?", answer: "Yes — and most serious banking aspirants do. The syllabuses overlap significantly. Kalnehi lets you track both exam dates and build a single preparation plan that covers both. Mastermind monitors whether you're ready for the earlier exam date and alerts you if you're not." },
];

export default function SbiPoPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "SBI PO Preparation", path: "/sbi-po" }]}
        faqs={FAQS}
      />

      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "SBI PO Preparation", path: "/sbi-po" }]} className="mb-2" />
      <article className="space-y-10">
        <ExamHero
          badge="SBI PO — State Bank of India Probationary Officer"
          headline="SBI PO Preparation Daily Planner — India's Most Competitive Banking Exam Needs Maximum Daily Output"
          subheadline="Over 20 lakh candidates compete for ~2000 SBI PO seats. The margin between clearing and failing is razor-thin. Daily mock practice, rigorous analysis, and no weak sections — that's what it takes."
        />

        <section className="space-y-3" aria-labelledby="sbipo-system">
          <h2 id="sbipo-system" className="text-xl font-bold text-kal-text">The SBI PO preparation system in Kalnehi</h2>
          <ul className="space-y-3 text-sm">
            {[
              { t: "Prelims + Mains tracking", d: "Set up separate syllabus trackers for Prelims (QA, Reasoning, English) and Mains (Data Analysis, Reasoning + Computer, English, GA). Mastermind monitors both phases and shifts focus as dates approach." },
              { t: "Mock test score logging", d: "Log each mock test score with section breakdowns. Mastermind tracks your improvement curve across mocks and tells you when you've plateaued in a section and need to change your approach." },
              { t: "Descriptive paper practice", d: "SBI PO Mains has a 30-minute descriptive paper. Track your daily essay and letter writing practice as a separate habit — Mastermind flags when you've gone a week without practice." },
              { t: "Group Exercise preparation", d: "SBI PO has a Group Exercise round that most candidates underprepare. Log your GD/GE practice sessions and track current affairs reading as a daily habit." },
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
            <li><Link href="/ibps-po" className="font-medium text-kal-accent-dark hover:underline">IBPS PO preparation →</Link></li>
            <li><Link href="/features/consistency-tracker" className="font-medium text-kal-accent-dark hover:underline">Consistency Tracker — heatmap & streaks →</Link></li>
          </ul>
        </section>

        <FAQBlock items={FAQS} />
        <CTABanner headline="Build your SBI PO prep system" subtext="3 days free. Mastermind. No credit card." />
      </article>
    </>
  );
}
