import Link from "next/link";
import { CTABanner } from "@/components/marketing/CTABanner";
import { ExamHero } from "@/components/marketing/ExamHero";
import { FAQBlock } from "@/components/marketing/FAQBlock";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/nda",
  title: `Daily Planner for NDA Preparation | ${SITE_NAME}`,
  description: `NDA has a Maths paper (300 marks) and a General Ability Test (600 marks). Kalnehi tracks your preparation, helps you plan daily study blocks, and ensures Maths and GAT get balanced coverage.`,
});

const FAQS = [
  { question: "What is the NDA exam structure?", answer: "NDA has two written papers. Paper I: Mathematics (120 questions, 300 marks, 2.5 hours). Paper II: General Ability Test — English (200 marks) + General Knowledge (400 marks) covering Physics, Chemistry, General Science, History, Geography, and Current Events. Total: 900 marks written + 900 marks SSB interview." },
  { question: "Can I prepare for NDA while in Class 12?", answer: "Yes. NDA Maths is largely Class 11-12 level. The GAT covers General Science and Social Studies broadly. Most NDA aspirants start preparation in Class 11. Kalnehi helps you plan NDA prep alongside Board studies." },
  { question: "How does Kalnehi help NDA aspirants?", answer: "Kalnehi tracks your NDA Maths chapter completion (Algebra, Trigonometry, Calculus, Vectors, Statistics) and your GAT subject coverage (Physics, Chemistry, History, Geography). Mastermind ensures you're not spending all your time on Maths while GAT gets neglected." },
  { question: "What is the NDA cutoff?", answer: "NDA cutoffs vary by year and category. The written exam cutoff (to qualify for SSB) is typically 300-360/900. The final cutoff after SSB is typically 720-750/1800. Kalnehi's marks engine helps you target the written paper cutoff specifically." },
];

export default function NdaPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "NDA Preparation", path: "/nda" }]}
        faqs={FAQS}
      />

      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "NDA Preparation", path: "/nda" }]} className="mb-2" />
      <article className="space-y-10">
        <ExamHero
          badge="NDA — National Defence Academy"
          headline="NDA Preparation Daily Planner — Maths + GAT Balanced Every Single Day"
          subheadline="NDA tests mathematical ability and general knowledge simultaneously. The students who clear the written exam don't just know Maths well — they've covered all 6 GAT subjects too. Kalnehi ensures you don't fall behind on either."
        />

        <section className="space-y-4" aria-labelledby="nda-syllabus">
          <h2 id="nda-syllabus" className="text-xl font-bold text-kal-text">NDA syllabus tracked in Kalnehi</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { p: "Paper I: Mathematics (300 marks)", topics: ["Algebra, Matrices, Determinants", "Trigonometry", "Analytical Geometry (2D & 3D)", "Differential Calculus & Integral Calculus", "Vector Algebra, Statistics & Probability"] },
              { p: "Paper II: GAT (600 marks)", topics: ["English — Grammar, Comprehension", "Physics — Mechanics, Heat, Optics", "Chemistry — Physical & Inorganic", "History — India & World", "Geography — Physical, Indian", "Current Events"] },
            ].map(({ p, topics }) => (
              <div key={p} className="kal-glass-card rounded-xl p-4 space-y-1.5">
                <h3 className="text-xs font-bold text-kal-accent-dark">{p}</h3>
                <ul className="space-y-0.5">{topics.map(t => <li key={t} className="text-xs text-kal-text-secondary">· {t}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-kal-text">Related pages</h2>
          <ul className="space-y-1 text-sm">
            <li><Link href="/features/marks-engine" className="font-medium text-kal-accent-dark hover:underline">Marks Engine — track and predict your NDA score →</Link></li>
            <li><Link href="/blog/how-toppers-track-syllabus" className="font-medium text-kal-accent-dark hover:underline">How toppers track their syllabus →</Link></li>
          </ul>
        </section>

        <FAQBlock items={FAQS} />
        <CTABanner headline="Build your NDA prep system" subtext="3 days free. Mastermind. No credit card." />
      </article>
    </>
  );
}
