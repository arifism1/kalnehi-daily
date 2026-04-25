import Link from "next/link";
import { CTABanner } from "@/components/marketing/CTABanner";
import { ExamHero } from "@/components/marketing/ExamHero";
import { FAQBlock } from "@/components/marketing/FAQBlock";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/ca-final",
  title: `Daily Planner for CA Final Preparation | ${SITE_NAME}`,
  description: `CA Final is the last exam before you become a Chartered Accountant. 8 advanced papers, massive syllabuses, and articleship pressure. Kalnehi tracks it all so nothing falls through.`,
});

const FAQS = [
  { question: "What are the 8 papers in CA Final?", answer: "Group 1: Financial Reporting, Strategic Financial Management, Advanced Auditing & Professional Ethics, Corporate & Economic Laws. Group 2: Strategic Cost Management, Elective Paper (one of 6 options), Direct Tax Laws, International Taxation, Indirect Tax Laws." },
  { question: "How does Kalnehi help CA Final students during articleship?", answer: "CA Final is unique because most students prepare during a 3-year articleship with limited daily study time. Kalnehi helps you extract maximum output from 3-4 hours per day — planning exactly which paper and which chapter to cover each day, and tracking progress so nothing slips for months at a time." },
  { question: "How does Mastermind help CA Final preparation?", answer: "Mastermind monitors your 8-paper coverage and identifies which subject is most underprepared relative to your CA Final date. It accounts for which papers you're writing in Group 1 vs Group 2 and builds a balanced study strategy." },
  { question: "What is the CA Final pass rate?", answer: "CA Final both groups pass rate is around 10-15%. Single group pass rates are higher (20-25%). The exam is genuinely hard — but most failures are due to preparation imbalances across 8 papers, not intelligence. Kalnehi's syllabus tracker prevents that." },
];

export default function CaFinalPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "CA Final Preparation", path: "/ca-final" }]}
        faqs={FAQS}
      />

      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "CA Final Preparation", path: "/ca-final" }]} className="mb-2" />
      <article className="space-y-10">
        <ExamHero
          badge="CA Final — ICAI"
          headline="CA Final Preparation Daily Planner — The Last Exam Before You Become a CA"
          subheadline="CA Final is 8 papers of advanced content, prepared during a 3-year articleship that leaves you with 3-4 hours per day at most. Every hour has to count. Kalnehi makes sure they do."
        />

        <section className="space-y-3" aria-labelledby="cafinal-system">
          <h2 id="cafinal-system" className="text-xl font-bold text-kal-text">The CA Final preparation system in Kalnehi</h2>
          <ul className="space-y-3 text-sm">
            {[
              { t: "8-paper syllabus tracker", d: "Track every chapter in Financial Reporting, SFM, Audit, Corporate Laws, SCM, Direct Tax and Indirect Tax. See completion percentage per paper at a glance." },
              { t: "Daily log with session type", d: "Log whether you're doing first reading, problem practice, revision, or mock test review. Mastermind uses this to analyse your study pattern and quality — not just hours." },
              { t: "Mock test score tracking", d: "Log ICAI mock, coaching mock and self-test scores paper by paper. Mastermind tracks your improvement curve and tells you which paper needs more practice time before the exam." },
              { t: "Elective paper strategy", d: "CA Final's elective paper (Risk Management, International Taxation, etc.) is often underprepared. Mastermind ensures you're giving it equal priority alongside the other 7 papers." },
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
            <li><Link href="/ca-intermediate" className="font-medium text-kal-accent-dark hover:underline">CA Intermediate Preparation →</Link></li>
            <li><Link href="/for/ca-students" className="font-medium text-kal-accent-dark hover:underline">Kalnehi for CA Students →</Link></li>
          </ul>
        </section>

        <FAQBlock items={FAQS} />
        <CTABanner headline="Track your CA Final prep — all 8 papers" subtext="3 days free. Mastermind. No credit card." />
      </article>
    </>
  );
}
