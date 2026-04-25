import Link from "next/link";
import { CTABanner } from "@/components/marketing/CTABanner";
import { ExamHero } from "@/components/marketing/ExamHero";
import { FAQBlock } from "@/components/marketing/FAQBlock";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/sat",
  title: `Daily Planner for SAT Preparation | ${SITE_NAME}`,
  description: `The digital SAT has Reading & Writing and Math sections. Kalnehi helps you track your daily practice, log Khan Academy progress, and use Mastermind to identify your score improvement areas.`,
});

const FAQS = [
  { question: "What is the Digital SAT structure?", answer: "The Digital SAT (dSAT) has two sections: Reading and Writing (54 questions, 64 minutes) and Math (44 questions, 70 minutes). Total: 1600 scale. It's adaptive — Module 2 difficulty depends on Module 1 performance. SAT scores are used for US college admissions and some Indian institutions." },
  { question: "What SAT score do I need for top US universities?", answer: "Top universities (Ivy League, MIT, Stanford) typically see admits with 1500+ SAT. Many applicants have 1550-1600. For good US universities, 1350-1450 is competitive. Kalnehi's marks engine helps you target the specific score band you need." },
  { question: "How much time does SAT preparation take?", answer: "Students starting from a 1200 baseline typically need 3-4 months of focused preparation (2-3 hours daily) to reach 1400+. Getting from 1400 to 1500+ can take another 2-3 months. Khan Academy's official SAT prep pairs well with Kalnehi's tracking." },
  { question: "How does Kalnehi help SAT aspirants?", answer: "Track your daily Khan Academy practice sessions, full-length practice tests, and topic-wise completion in Kalnehi. Mastermind reads your practice test scores and identifies which question types within Reading & Writing or Math are your weakest." },
];

export default function SatPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "SAT Preparation", path: "/sat" }]}
        faqs={FAQS}
      />

      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "SAT Preparation", path: "/sat" }]} className="mb-2" />
      <article className="space-y-10">
        <ExamHero
          badge="SAT — Scholastic Assessment Test"
          headline="SAT Preparation Daily Planner — Consistent Practice Gets You Into Your Dream University"
          subheadline="The Digital SAT rewards consistent daily practice over cramming. Students who improve from 1200 to 1450+ do it through daily 45-60 minute practice sessions over 3-4 months — not 10-hour marathon days the week before the test."
        />

        <section className="space-y-4" aria-labelledby="sat-sections">
          <h2 id="sat-sections" className="text-xl font-bold text-kal-text">Digital SAT sections tracked in Kalnehi</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { s: "Reading & Writing (800)", topics: ["Reading Comprehension — literary, informational", "Command of Evidence (textual + quantitative)", "Words in Context, Cross-text Connections", "Expression of Ideas — rhetoric, transitions", "Standard English Conventions — grammar"] },
              { s: "Math (800)", topics: ["Algebra — linear equations, functions", "Advanced Math — quadratics, exponentials", "Problem Solving & Data Analysis", "Geometry & Trigonometry"] },
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
            <li><Link href="/gre" className="font-medium text-kal-accent-dark hover:underline">GRE preparation →</Link></li>
            <li><Link href="/tools/study-hours-calculator" className="font-medium text-kal-accent-dark hover:underline">Study hours calculator — how many hours do you need? →</Link></li>
          </ul>
        </section>

        <FAQBlock items={FAQS} />
        <CTABanner headline="Build your SAT prep system" subtext="3 days free. Mastermind. No credit card." />
      </article>
    </>
  );
}
