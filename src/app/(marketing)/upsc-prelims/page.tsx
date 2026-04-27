import Link from "next/link";
import { CTABanner } from "@/components/marketing/CTABanner";
import { ExamHero } from "@/components/marketing/ExamHero";
import { FAQBlock } from "@/components/marketing/FAQBlock";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/upsc-prelims",
  title: `Daily Planner for UPSC Prelims Preparation | ${SITE_NAME}`,
  description: `UPSC Prelims (GS Paper I + CSAT) is the first filter in the CSE journey. Kalnehi Daily tracks your GS topics, current affairs habit, and mock scores — and helps you plan each day with Mastermind.`,
});

const FAQS = [
  { question: "What is the UPSC Prelims structure?", answer: "UPSC Prelims has two papers — GS Paper I (100 questions, 200 marks, negative marking) covering History, Polity, Geography, Economy, Environment, Science & Technology and Current Affairs; and CSAT Paper II (80 questions, 200 marks, qualifying — 33% required). Only GS Paper I marks are counted for cutoff." },
  { question: "How many months of preparation is needed for UPSC Prelims?", answer: "Most successful candidates dedicate 6-12 months of focused preparation for Prelims. Current Affairs requires daily engagement throughout this entire period. Kalnehi Daily tracks both your static syllabus completion and your daily current affairs reading habit." },
  { question: "How does Kalnehi Daily help UPSC Prelims aspirants?", answer: "Kalnehi Daily tracks your GS1 topic completion across History, Polity, Geography, Economy and Environment. It tracks your daily newspaper reading as a habit. Mastermind monitors your mock scores and tells you which GS topics are your weakest areas based on your test performance." },
  { question: "What is the UPSC Prelims cutoff?", answer: "The Prelims cutoff (GS Paper I) varies each year — typically between 90-110 marks (out of 200) for General category. It fluctuates based on paper difficulty. Kalnehi Daily's mock score tracking helps you gauge your readiness against previous year cutoffs." },
];

export default function UpscPrelimsPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "UPSC", path: "/upsc" }, { name: "UPSC Prelims", path: "/upsc-prelims" }]}
        faqs={FAQS}
      />

      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "UPSC", path: "/upsc" }, { name: "UPSC Prelims", path: "/upsc-prelims" }]} className="mb-2" />
      <article className="space-y-10">
        <ExamHero
          badge="UPSC CSE Prelims"
          headline="UPSC Prelims Preparation Daily Planner — Clear the First Filter with Consistent GS Coverage"
          subheadline="UPSC Prelims eliminates 99% of candidates. The survivors aren't always the most knowledgeable — they're the ones who covered the full GS syllabus, maintained daily Current Affairs, and practised enough MCQs to know the exam's logic."
        />

        <section className="space-y-4" aria-labelledby="prelims-gs">
          <h2 id="prelims-gs" className="text-xl font-bold text-kal-text">GS Paper I topics tracked in Kalnehi Daily</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { area: "History", topics: ["Ancient India (Indus Valley to Gupta)", "Medieval India (Delhi Sultanate, Mughals)", "Modern India (British Rule, Independence Movement)", "Art & Culture, World History"] },
              { area: "Polity", topics: ["Constitution — Features, Amendments", "Fundamental Rights, DPSP, Duties", "Parliament, Executive, Judiciary", "Local Bodies, Elections, Emergency Provisions"] },
              { area: "Geography", topics: ["Physical Geography (Climate, Rivers, Soils)", "Human Geography (Population, Agriculture)", "Indian Geography (Monsoon, Resources)", "World Geography"] },
              { area: "Economy + Environment", topics: ["Economic Planning, GDP, Inflation", "Banking, Fiscal Policy, Trade", "Ecology, Biodiversity, Climate Change", "Environment Conventions & Schemes"] },
            ].map(({ area, topics }) => (
              <div key={area} className="kal-glass-card rounded-xl p-4 space-y-1.5">
                <h3 className="text-xs font-bold text-kal-accent-dark">{area}</h3>
                <ul className="space-y-0.5">{topics.map(t => <li key={t} className="text-xs text-kal-text-secondary">· {t}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-kal-text">Related pages</h2>
          <ul className="space-y-1 text-sm">
            <li><Link href="/upsc" className="font-medium text-kal-accent-dark hover:underline">UPSC CSE complete guide →</Link></li>
            <li><Link href="/upsc-mains" className="font-medium text-kal-accent-dark hover:underline">UPSC Mains preparation →</Link></li>
            <li><Link href="/blog/upsc-consistency-more-important-than-hours" className="font-medium text-kal-accent-dark hover:underline">Why UPSC toppers study fewer hours →</Link></li>
          </ul>
        </section>

        <FAQBlock items={FAQS} />
        <CTABanner headline="Start your UPSC Prelims prep system" subtext="3 days free. Mastermind. No credit card." />
      </article>
    </>
  );
}
