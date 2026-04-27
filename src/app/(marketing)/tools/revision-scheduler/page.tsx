import { Suspense } from "react";
import { CTABanner } from "@/components/marketing/CTABanner";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";
import { absoluteProductionUrl } from "@/lib/site";
import { RevisionSchedulerClient } from "@/components/pricing/RevisionSchedulerClient";

export const metadata = marketingPageMetadata({
  path: "/tools/revision-scheduler",
  title: `Spaced Repetition Revision Scheduler for Competitive Exams | ${SITE_NAME}`,
  description: `Enter your topics and study dates. Get a spaced repetition revision schedule for Day 1, 3, 7, 14 and 30 reviews. Export as CSV. Free — no login needed.`,
});

export default function RevisionSchedulerPage() {
  const softwareApplicationLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Spaced Repetition Revision Scheduler",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web Browser",
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    url: absoluteProductionUrl("/tools/revision-scheduler"),
    description: "Generate a spaced repetition revision schedule for JEE, NEET, UPSC and all competitive exam topics. Free, instant, no signup.",
  };

  const faqs = [
    { question: "What is spaced repetition?", answer: "Spaced repetition is a learning technique where you review material at increasing intervals. Instead of cramming everything the night before, you review on Day 1, Day 3, Day 7, Day 14 and Day 30 after first studying a topic. This matches how human memory works." },
    { question: "Which exams is this useful for?", answer: "All of them. JEE, NEET, UPSC, CAT, GATE, CA, CLAT, SSC, Banking — any exam with significant content volume benefits from spaced repetition. The more topics you cover, the more critical the scheduling becomes." },
    { question: "Can I export the schedule?", answer: "Yes. You can export as CSV (opens in Excel / Google Sheets) or copy as plain text to paste into your notes. No data is stored on our servers — everything runs in your browser." },
    { question: "How is this different from Kalnehi Daily's revision reminders?", answer: "This tool gives you a static schedule you can paste anywhere. Inside Kalnehi Daily, Revision Reminders is your dated queue — set due dates, link syllabus topics if you want, and push reviews into your daily plan when you're ready." },
  ];

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
          { name: "Revision Scheduler", path: "/tools/revision-scheduler" },
        ]}
        faqs={faqs}
      />

      <Breadcrumbs items={[
          { name: "Home", path: "/" },
          { name: "Free Tools", path: "/tools" },
          { name: "Revision Scheduler", path: "/tools/revision-scheduler" },
        ]} className="mb-2" />

      <div className="space-y-10">
        <header className="space-y-3">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-kal-accent/25 bg-kal-accent-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-kal-accent-dark">
            <span className="h-1.5 w-1.5 rounded-full bg-kal-accent" aria-hidden />
            Free Tool — No login required
          </p>
          <h1 className="kal-feature-title">Spaced Repetition Revision Scheduler</h1>
          <p className="max-w-xl text-sm text-kal-text-secondary leading-relaxed">
            Enter the topics you've studied and when you studied them. Get a revision schedule for Day 1, 3, 7, 14 and 30 reviews — the scientifically proven intervals for long-term retention. Export as CSV.
          </p>
        </header>

        <div className="kal-glass-card rounded-2xl p-6">
          <Suspense fallback={<div className="text-sm text-kal-muted">Loading...</div>}>
            <RevisionSchedulerClient />
          </Suspense>
        </div>

        <div className="space-y-3 text-sm text-kal-text-secondary">
          <h2 className="text-base font-semibold text-kal-text">The science behind spaced repetition</h2>
          <p>
            Hermann Ebbinghaus discovered in 1885 that memory follows a "forgetting curve" — we lose 50% of new information within a day without reinforcement. Reviewing at the right intervals (before you forget, not after) resets this curve each time.
          </p>
          <p>
            For JEE and NEET aspirants studying 100+ chapters, this is not optional — it's the only way to retain Inorganic Chemistry while still learning Mechanics. For UPSC aspirants covering 2000+ topics across GS papers, revision scheduling is the difference between reading and remembering.
          </p>
          <p>
            This tool generates the schedule. Following it is your job.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-base font-semibold text-kal-text">Frequently asked questions</h2>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <div key={faq.question} className="kal-glass-card rounded-xl p-4 space-y-1">
                <p className="text-sm font-semibold text-kal-text">{faq.question}</p>
                <p className="text-sm text-kal-text-secondary leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <CTABanner
          headline="Track the same intervals inside Kalnehi Daily"
          subtext="Revision Reminders keeps your due list next to your syllabus and daily plan. Start free for 3 days."
        />
      </div>
    </>
  );
}
