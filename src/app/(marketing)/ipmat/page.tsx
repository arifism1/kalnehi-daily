import Link from "next/link";
import { CTABanner } from "@/components/marketing/CTABanner";
import { ExamHero } from "@/components/marketing/ExamHero";
import { FAQBlock } from "@/components/marketing/FAQBlock";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/ipmat",
  title: `Daily Planner for IPMAT Preparation | ${SITE_NAME}`,
  description: `IPMAT (IIM Indore, Rohtak) has Quantitative Ability and Verbal Ability sections. Kalnehi Daily tracks your chapter-wise progress and Mastermind helps you reach the sectional cutoffs needed.`,
});

const FAQS = [
  { question: "What is IPMAT and who should take it?", answer: "IPMAT (Integrated Programme in Management Aptitude Test) is offered by IIM Indore and IIM Rohtak for their 5-year IPM programme. Class 12 students who want to do their MBA from an IIM without a conventional bachelor's degree take IPMAT. It's one of the most prestigious management entrance tests for school leavers." },
  { question: "What is the IPMAT exam structure?", answer: "IPMAT IIM Indore: Section 1 — Quantitative Ability (MCQ, 45 questions, 40 minutes); Section 2 — Quantitative Ability (Short Answer, 15 questions, 40 minutes); Section 3 — Verbal Ability (45 questions, 40 minutes). There's a PI round after written results. IPMAT Rohtak has a different pattern." },
  { question: "How does Kalnehi Daily help IPMAT aspirants?", answer: "Kalnehi Daily tracks your Quantitative Ability topic completion (Arithmetic, Algebra, Geometry, Number Theory) and Verbal Ability preparation (RC, Para Jumbles, Grammar). Mastermind monitors which section is weaker and tells you how to rebalance. Sectional cutoffs are strict — both sections matter equally." },
  { question: "Can I prepare for IPMAT and Class 12 Boards simultaneously?", answer: "Yes — most IPMAT aspirants are in Class 12. Kalnehi Daily handles both exam syllabuses in one place and Mastermind helps you allocate daily time between Boards and IPMAT prep. The overlap in Mathematics is significant." },
];

export default function IpmatPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "IPMAT Preparation", path: "/ipmat" }]}
        faqs={FAQS}
      />

      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "IPMAT Preparation", path: "/ipmat" }]} className="mb-2" />
      <article className="space-y-10">
        <ExamHero
          badge="IPMAT — IIM Indore & Rohtak"
          headline="IPMAT Preparation Daily Planner — Get Into IIM Without Waiting for an MBA"
          subheadline="IPMAT is your shortcut to IIM — directly after Class 12. The competition is intense and sectional cutoffs are non-negotiable. Kalnehi Daily tracks your QA and VA preparation daily so you don't discover gaps during the exam."
        />

        <section className="space-y-4" aria-labelledby="ipmat-sections">
          <h2 id="ipmat-sections" className="text-xl font-bold text-kal-text">IPMAT sections tracked in Kalnehi Daily</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { s: "Quantitative Ability", topics: ["Arithmetic (Percentages, Ratios, Profit-Loss, Time-Work)", "Algebra (Equations, Polynomials, Inequalities)", "Geometry & Mensuration", "Number Theory (Divisibility, Remainders, LCM/HCF)", "Data Interpretation (Tables, Graphs, Caselets)"] },
              { s: "Verbal Ability", topics: ["Reading Comprehension", "Para Jumbles, Para Completion", "Sentence Correction, Fill in the Blanks", "Vocabulary — Synonyms, Antonyms, Analogy", "Critical Reasoning"] },
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
            <li><Link href="/cat" className="font-medium text-kal-accent-dark hover:underline">CAT preparation →</Link></li>
            <li><Link href="/cbse-class-12" className="font-medium text-kal-accent-dark hover:underline">CBSE Class 12 Board preparation →</Link></li>
          </ul>
        </section>

        <FAQBlock items={FAQS} />
        <CTABanner headline="Build your IPMAT prep system" subtext="7 days free. Mastermind. No credit card." />
      </article>
    </>
  );
}
