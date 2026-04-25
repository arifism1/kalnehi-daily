import { CTABanner } from "@/components/marketing/CTABanner";
import { FAQBlock } from "@/components/marketing/FAQBlock";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";
import { absoluteProductionUrl } from "@/lib/site";
import { StudyHoursCalculatorClient } from "@/components/pricing/StudyHoursCalculatorClient";

export const metadata = marketingPageMetadata({
  path: "/tools/study-hours-calculator",
  title: `Study Hours Calculator for Competitive Exams | ${SITE_NAME}`,
  description: `How many hours do you need to study for JEE, NEET, UPSC, CAT or GATE? Enter your exam date, remaining topics and available time — get a feasibility assessment instantly. Free, no login.`,
});

const FAQS = [
  { question: "How does the study hours calculator work?", answer: "Enter your exam date, the number of topics/chapters remaining, estimated hours per topic, and your daily available study time. The calculator computes total hours needed vs hours available, gives you a feasibility assessment, and recommends a daily target." },
  { question: "What is a reasonable 'hours per topic' estimate?", answer: "For easy chapters (factual, NCERT-level): 3-4 hours. For medium chapters (conceptual, needs problems): 5-7 hours. For hard chapters (complex concepts, heavy practice needed): 8-12 hours. JEE Physics and GATE algorithms topics are often 8-10 hours each." },
  { question: "The calculator says I don't have enough time — what should I do?", answer: "Prioritise ruthlessly. Not all topics carry equal marks weight. If you have 60 days and the calculator shows 80 hours of deficit, cut 10-15 lowest-weightage topics from your plan. Focus every remaining hour on high-yield content." },
  { question: "Does this calculator work for all exams?", answer: "Yes. It's exam-agnostic — the calculation is based on hours, topics, and time, not exam-specific content. Use it for JEE, NEET, UPSC, CAT, GATE, CA, SSC, Banking or any other exam." },
];

export default function StudyHoursCalculatorPage() {
  const softwareApplicationLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Study Hours Calculator",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web Browser",
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    url: absoluteProductionUrl("/tools/study-hours-calculator"),
    description: "Calculate exactly how many study hours you need for JEE, NEET, UPSC or any competitive exam based on your exam date, remaining topics, and available daily time.",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationLd) }}
      />
      <MarketingPageJsonLd
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Free Tools", path: "/tools" },
          { name: "Study Hours Calculator", path: "/tools/study-hours-calculator" },
        ]}
        faqs={FAQS}
      />

      <Breadcrumbs items={[
          { name: "Home", path: "/" },
          { name: "Free Tools", path: "/tools" },
          { name: "Study Hours Calculator", path: "/tools/study-hours-calculator" },
        ]} className="mb-2" />

      <div className="space-y-10">
        <header className="space-y-3">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-kal-accent/25 bg-kal-accent-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-kal-accent-dark">
            <span className="h-1.5 w-1.5 rounded-full bg-kal-accent" aria-hidden />
            Free Tool — No login required
          </p>
          <h1 className="kal-feature-title">Study Hours Calculator for Competitive Exams</h1>
          <p className="max-w-2xl text-sm text-kal-text-secondary leading-relaxed">
            "Do I have enough time?" is the most important question in exam preparation — and most students answer it with a gut feeling. This calculator gives you a precise, data-driven answer in 30 seconds.
          </p>
        </header>

        <div className="kal-glass-card rounded-2xl p-6">
          <StudyHoursCalculatorClient />
        </div>

        <section className="space-y-3" aria-labelledby="how-it-works">
          <h2 id="how-it-works" className="text-lg font-bold text-kal-text">How the calculation works</h2>
          <div className="space-y-2 text-sm text-kal-text-secondary leading-relaxed">
            <p>The calculator estimates total hours needed by multiplying remaining topics by your estimated hours per topic (first reading + initial problems), adding revision time (typically 40-60% of first reading time), and mock test hours.</p>
            <p>Available hours are calculated from your exam date with a 15% buffer for sick days and unavoidable gaps. If available hours exceed needed hours by 30%+, your preparation is comfortable. Below that threshold, you're in tight or critical territory.</p>
            <p>The recommended daily hours is the minimum you need to cover everything — not including buffer. Aim slightly above this minimum to build slack.</p>
          </div>
        </section>

        <FAQBlock items={FAQS} title="Frequently asked questions" />

        <CTABanner
          headline="Track your actual progress daily with Kalnehi"
          subtext="This calculator tells you what you need. Kalnehi helps you execute it — syllabus tracker, Mastermind, daily planner."
        />
      </div>
    </>
  );
}
