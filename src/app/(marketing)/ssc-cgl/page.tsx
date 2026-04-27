import Link from "next/link";
import { CTABanner } from "@/components/marketing/CTABanner";
import { ExamHero } from "@/components/marketing/ExamHero";
import { FAQBlock } from "@/components/marketing/FAQBlock";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/ssc-cgl",
  title: `Daily Planner for SSC CGL Preparation | ${SITE_NAME}`,
  description: `SSC CGL has 4 sections — Quantitative Aptitude, English, General Awareness and Reasoning. Kalnehi Daily tracks your daily practice, mock scores and uses Mastermind to identify your weakest area.`,
});

const FAQS = [
  { question: "What are the 4 sections in SSC CGL Tier 1?", answer: "SSC CGL Tier 1 has 4 sections of 25 questions each (100 marks total, 60 minutes): Quantitative Aptitude, General Intelligence & Reasoning, General Awareness, and English Comprehension. There's 0.5 mark negative marking per wrong answer." },
  { question: "How long does SSC CGL preparation take?", answer: "For serious candidates with a good academic background, 6-8 months of dedicated preparation is standard. Candidates starting from a weak Maths base may need 10-12 months. Kalnehi Daily helps you plan a realistic timeline based on your current level." },
  { question: "What is the difference between SSC CGL Tier 1 and Tier 2?", answer: "Tier 1 is a screening test (all sections). Tier 2 is the main exam with separate papers: Paper I (Maths & Reasoning), Paper II (English), and Paper III (for specific posts like JSO). Kalnehi Daily tracks your preparation for both tiers separately." },
  { question: "How does Mastermind help SSC CGL aspirants?", answer: "Mastermind reads your mock test scores across all 4 sections and identifies which one is bringing your overall score down. For most SSC CGL aspirants, Quantitative Aptitude and General Awareness need the most structured practice — Mastermind tells you specifically which sub-topics within each section to target." },
];

export default function SscCglPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "SSC CGL Preparation", path: "/ssc-cgl" }]}
        faqs={FAQS}
      />

      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "SSC CGL Preparation", path: "/ssc-cgl" }]} className="mb-2" />
      <article className="space-y-10">
        <ExamHero
          badge="SSC CGL — Combined Graduate Level"
          headline="SSC CGL Preparation Daily Planner — Build the Daily Practice Habit That Gets You Central Government Jobs"
          subheadline="SSC CGL is one of India's most competitive government exams. The candidates who clear it aren't extraordinarily talented — they've practised mock after mock, tracked their weak areas relentlessly, and never skipped a day of General Awareness revision."
        />

        <section className="space-y-4" aria-labelledby="ssccgl-sections">
          <h2 id="ssccgl-sections" className="text-xl font-bold text-kal-text">SSC CGL sections tracked in Kalnehi Daily</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { s: "Quantitative Aptitude", topics: ["Number Systems, LCM/HCF", "Percentage, Profit & Loss", "Time & Work, Speed & Distance", "Algebra, Trigonometry, Geometry", "Data Interpretation"] },
              { s: "General Awareness", topics: ["Static GK (History, Polity, Geography)", "Science (Physics, Chemistry, Biology)", "Current Affairs (Monthly basis)", "Economy and Miscellaneous GK"] },
              { s: "Reasoning", topics: ["Analogy, Classification", "Series, Coding-Decoding", "Blood Relations, Direction", "Logical Venn Diagrams, Puzzles"] },
              { s: "English", topics: ["Reading Comprehension", "Grammar (Fill in the blanks, Error spotting)", "Vocabulary (Synonyms, Antonyms)", "Para Jumbles, Sentence Improvement"] },
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
            <li><Link href="/ssc-chsl" className="font-medium text-kal-accent-dark hover:underline">SSC CHSL preparation →</Link></li>
            <li><Link href="/features/marks-engine" className="font-medium text-kal-accent-dark hover:underline">Marks Engine — track mock scores and predict rank →</Link></li>
          </ul>
        </section>

        <FAQBlock items={FAQS} />
        <CTABanner headline="Build your SSC CGL prep system" subtext="3 days free. Mastermind. No credit card." />
      </article>
    </>
  );
}
