import Link from "next/link";
import { CTABanner } from "@/components/marketing/CTABanner";
import { ExamHero } from "@/components/marketing/ExamHero";
import { FAQBlock } from "@/components/marketing/FAQBlock";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/gre",
  title: `Daily Planner for GRE Preparation | ${SITE_NAME}`,
  description: `GRE requires daily Verbal vocab building, Quant practice and Analytical Writing. Kalnehi helps Indian students build the preparation habits that add 10-20 points to their GRE score.`,
});

const FAQS = [
  { question: "What is the GRE exam structure?", answer: "The GRE General Test has three sections: Verbal Reasoning (2 sections × 27 questions, 170 scale), Quantitative Reasoning (2 sections × 27 questions, 170 scale), and Analytical Writing Assessment (2 essays — Issue + Argument, 0-6 scale). The test adapts based on your first section performance in each area." },
  { question: "What GRE score is needed for top US MS programs?", answer: "Top programs (MIT, Stanford, Carnegie Mellon) typically want 165+ in Quant, 155+ in Verbal. Many admits have 320-330+ total. For mid-tier programs, 310-320 is competitive. Kalnehi's marks engine helps you target specific score benchmarks per section." },
  { question: "How long does GRE preparation take for Indian students?", answer: "For engineering graduates with strong Quant foundations, 6-8 weeks of focused preparation (3-4 hours daily) is sufficient to get 165+ in Quant. Verbal takes longer — building vocabulary and reading speed requires 2-3 months of daily practice." },
  { question: "How does Kalnehi help GRE preparation?", answer: "Kalnehi tracks your daily Verbal vocab building (word lists, flashcards), Quant topic completion, and AWA essay practice. Mastermind monitors your ETS practice test scores and tells you which section needs the most hours before your test date." },
];

export default function GrePage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "GRE Preparation", path: "/gre" }]}
        faqs={FAQS}
      />

      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "GRE Preparation", path: "/gre" }]} className="mb-2" />
      <article className="space-y-10">
        <ExamHero
          badge="GRE — Graduate Record Examinations"
          headline="GRE Preparation Daily Planner — Vocab, Quant and Writing. Every Day Without Exception."
          subheadline="GRE scores decide which US MS programs you can access. Indian engineering students usually score 165+ in Quant — the differentiator is Verbal. Daily vocabulary building, reading, and essay practice is the only way to improve it."
        />

        <section className="space-y-4" aria-labelledby="gre-sections">
          <h2 id="gre-sections" className="text-xl font-bold text-kal-text">GRE sections tracked in Kalnehi</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { s: "Verbal Reasoning (170)", topics: ["Vocabulary — Magoosh 1000, GRE Prep lists", "Text Completion (1/2/3 blanks)", "Sentence Equivalence", "Reading Comprehension — short + long"] },
              { s: "Quantitative (170)", topics: ["Arithmetic — Fractions, Percentages", "Algebra — Equations, Functions", "Geometry — Coordinate, Plane", "Data Analysis — Statistics"] },
              { s: "Analytical Writing (6.0)", topics: ["Issue Essay — take a position, 30 min", "Argument Essay — analyse argument, 30 min", "Essay pool practice (ETS published)", "Structure and template mastery"] },
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
            <li><Link href="/sat" className="font-medium text-kal-accent-dark hover:underline">SAT preparation →</Link></li>
            <li><Link href="/features/habit-maker" className="font-medium text-kal-accent-dark hover:underline">Habit Maker — build daily vocab routine →</Link></li>
          </ul>
        </section>

        <FAQBlock items={FAQS} />
        <CTABanner headline="Build your GRE prep system" subtext="3 days free. Mastermind. No credit card." />
      </article>
    </>
  );
}
