import Link from "next/link";
import { CTABanner } from "@/components/marketing/CTABanner";
import { ExamHero } from "@/components/marketing/ExamHero";
import { FAQBlock } from "@/components/marketing/FAQBlock";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/upsc-mains",
  title: `Daily Planner for UPSC Mains Preparation | ${SITE_NAME}`,
  description: `UPSC Mains has 9 papers — GS1-4, Essay, Optional I & II, plus qualifying language papers. Kalnehi tracks all papers and helps you maintain the writing practice and answer quality that Mains demands.`,
});

const FAQS = [
  { question: "How many papers are in UPSC Mains?", answer: "UPSC Mains has 9 papers: Essay, GS1, GS2, GS3, GS4, Optional Paper I, Optional Paper II, and two qualifying language papers (English + an Indian language). Only 7 papers are merit-based (Essay + GS1-4 + Optional I & II). Total merit marks: 1750." },
  { question: "How should I balance GS and Optional preparation for Mains?", answer: "Most aspirants give 40-50% of their prep time to Optional because it's 500 out of 1750 marks and typically separates toppers from average scorers. PrepBrain monitors this balance and alerts you if GS is getting disproportionately less time." },
  { question: "How does Kalnehi help with UPSC Mains answer writing practice?", answer: "Track your daily answer writing as a habit in Kalnehi. Log the number of answers written per day, which paper you practised, and your self-assessed quality. PrepBrain monitors your writing consistency and tells you when you've gone 3+ days without practice." },
  { question: "GS Paper IV (Ethics) is often neglected — how does Kalnehi help?", answer: "GS4 (Ethics, Integrity, Aptitude) requires case study practice and conceptual clarity — two things you can't cram in the last week. Kalnehi lets you track GS4 topic coverage separately and PrepBrain monitors how much time you're allocating to it vs GS1-3." },
];

export default function UpscMainsPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[{ name: "Home", path: "/" }, { name: "UPSC", path: "/upsc" }, { name: "UPSC Mains", path: "/upsc-mains" }]}
        faqs={FAQS}
      />
      <article className="space-y-10">
        <ExamHero
          badge="UPSC CSE Mains"
          headline="UPSC Mains Preparation Daily Planner — 9 Papers, 1750 Marks, the Real Battle"
          subheadline="UPSC Mains is where the real IAS journey begins. The aspirants who succeed aren't the ones who read the most — they're the ones who practised writing consistently, covered their Optional deeply, and never let any GS paper fall behind."
        />

        <section className="space-y-4" aria-labelledby="mains-papers">
          <h2 id="mains-papers" className="text-xl font-bold text-kal-text">UPSC Mains papers tracked in Kalnehi</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { paper: "GS Paper I (250 marks)", topics: ["Indian Heritage and Culture", "History — Ancient, Medieval, Modern", "World History (18th century onwards)", "Indian Society, Diversity, Globalisation", "Physical Geography, Resources, Disasters"] },
              { paper: "GS Paper II (250 marks)", topics: ["Indian Polity, Constitution", "Governance, Social Justice", "International Relations", "India-Neighbour Relations"] },
              { paper: "GS Paper III (250 marks)", topics: ["Indian Economy, Planning", "Agriculture, Food Security", "Technology, Innovation, Security", "Environment, Disaster Management"] },
              { paper: "GS Paper IV + Essay (250+250)", topics: ["Ethics, Integrity, Aptitude", "Contributions of Moral Thinkers", "Case Studies on Ethics", "Essay: 2 papers × 1250 words each"] },
            ].map(({ paper, topics }) => (
              <div key={paper} className="kal-glass-card rounded-xl p-4 space-y-1.5">
                <h3 className="text-xs font-bold text-kal-accent-dark">{paper}</h3>
                <ul className="space-y-0.5">{topics.map(t => <li key={t} className="text-xs text-kal-text-secondary">· {t}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-kal-text">Related pages</h2>
          <ul className="space-y-1 text-sm">
            <li><Link href="/upsc" className="font-medium text-kal-accent-dark hover:underline">UPSC CSE complete guide →</Link></li>
            <li><Link href="/blog/upsc-daily-study-routine" className="font-medium text-kal-accent-dark hover:underline">What a 12-hour UPSC prep day actually looks like →</Link></li>
          </ul>
        </section>

        <FAQBlock items={FAQS} />
        <CTABanner headline="Build your UPSC Mains system" subtext="3 days free. PrepBrain AI. No credit card." />
      </article>
    </>
  );
}
