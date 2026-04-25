import Link from "next/link";
import { CTABanner } from "@/components/marketing/CTABanner";
import { ExamHero } from "@/components/marketing/ExamHero";
import { FAQBlock } from "@/components/marketing/FAQBlock";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/clat",
  title: `Daily Planner for CLAT Preparation | ${SITE_NAME}`,
  description: `CLAT has 5 sections — English, Current Affairs, Legal Reasoning, Logical Reasoning and Quantitative Techniques. Kalnehi tracks your section-wise progress and Mastermind identifies your score gaps.`,
});

const FAQS = [
  { question: "What are the 5 sections in CLAT?", answer: "CLAT has: English Language (20% weight) — comprehension and vocabulary; Current Affairs including General Knowledge (25%) — legal news, recent developments; Legal Reasoning (25%) — passages with legal scenarios; Logical Reasoning (20%) — critical reasoning; Quantitative Techniques (10%) — data interpretation and maths." },
  { question: "How many hours per day should I study for CLAT?", answer: "For Class 12 students preparing alongside Boards, 3-4 focused hours per day works well. Dedicated drop year candidates can do 6-8 hours. The daily newspaper reading habit for Current Affairs must be non-negotiable regardless of total hours." },
  { question: "Does Kalnehi help with CLAT reading comprehension practice?", answer: "Kalnehi tracks your daily practice sessions — including RC passages, legal reasoning sets and logical reasoning. Log each day's practice and Mastermind monitors your consistency to ensure you're not skipping any section for weeks." },
  { question: "How does Mastermind help CLAT aspirants?", answer: "Mastermind reads your mock test data across all 5 sections and tells you which section is pulling your overall score down the most. It recommends reallocating daily study time to your weakest section until the next mock test." },
];

export default function ClatPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "CLAT Preparation", path: "/clat" }]}
        faqs={FAQS}
      />

      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "CLAT Preparation", path: "/clat" }]} className="mb-2" />
      <article className="space-y-10">
        <ExamHero
          badge="CLAT — Common Law Admission Test"
          headline="CLAT Preparation Daily Planner — Read More, Reason Sharper, Score Higher"
          subheadline="CLAT rewards consistent reading, legal reasoning practice and Current Affairs depth. Students who crack NLSIU and NALSAR do one thing every single day without fail: they read, reason, and practise. Kalnehi builds that habit."
        />

        <section className="space-y-4" aria-labelledby="clat-sections">
          <h2 id="clat-sections" className="text-xl font-bold text-kal-text">CLAT sections tracked in Kalnehi</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { s: "English Language (20%)", tips: "2-3 RC passages daily. Track speed and accuracy separately. Mastermind flags when your reading speed has plateaued." },
              { s: "Current Affairs + GK (25%)", tips: "Daily newspaper reading is non-negotiable. Track it as a Kalnehi habit. Legal news from The Hindu and Live Law matters most." },
              { s: "Legal Reasoning (25%)", tips: "CLAT's highest-value section. Practice passage-based legal scenarios. Kalnehi tracks your legal reasoning problem sets completed per week." },
              { s: "Logical Reasoning (20%)", tips: "Critical reasoning and argument analysis. Daily 20-minute practice is more effective than weekly marathons." },
            ].map(({ s, tips }) => (
              <div key={s} className="kal-glass-card rounded-xl p-4 space-y-1.5">
                <h3 className="text-xs font-bold text-kal-accent-dark">{s}</h3>
                <p className="text-xs text-kal-text-secondary">{tips}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-kal-text">Related pages</h2>
          <ul className="space-y-1 text-sm">
            <li><Link href="/features/habit-maker" className="font-medium text-kal-accent-dark hover:underline">Habit Maker — build your daily reading habit →</Link></li>
            <li><Link href="/blog/study-consistency-vs-long-hours" className="font-medium text-kal-accent-dark hover:underline">Consistency vs long hours — what the data shows →</Link></li>
          </ul>
        </section>

        <FAQBlock items={FAQS} />
        <CTABanner headline="Build your CLAT prep system" subtext="3 days free. Mastermind. No credit card." />
      </article>
    </>
  );
}
