import { Suspense } from "react";
import { CTABanner } from "@/components/marketing/CTABanner";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";
import { absoluteProductionUrl } from "@/lib/site";
import { ExamCountdownClient } from "@/components/pricing/ExamCountdownClient";

export const metadata = marketingPageMetadata({
  path: "/tools/exam-countdown",
  title: `Exam Countdown Timer for JEE, NEET, UPSC, CAT | ${SITE_NAME}`,
  description: `How many days until JEE, NEET, UPSC Prelims, CAT or GATE? Select your exam and see the exact countdown in days, weeks and months. Free. Shareable link.`,
});

export default function ExamCountdownPage() {
  const softwareApplicationLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Exam Countdown Timer",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web Browser",
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    url: absoluteProductionUrl("/tools/exam-countdown"),
    description: "Countdown timer for JEE Main, JEE Advanced, NEET, UPSC, CAT, GATE, CA and all major Indian competitive exams.",
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
          { name: "Exam Countdown", path: "/tools/exam-countdown" },
        ]}
      />

      <Breadcrumbs items={[
          { name: "Home", path: "/" },
          { name: "Free Tools", path: "/tools" },
          { name: "Exam Countdown", path: "/tools/exam-countdown" },
        ]} className="mb-2" />

      <div className="space-y-10">
        <header className="space-y-3">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-kal-accent/25 bg-kal-accent-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-kal-accent-dark">
            <span className="h-1.5 w-1.5 rounded-full bg-kal-accent" aria-hidden />
            Free Tool — No login required
          </p>
          <h1 className="kal-feature-title">Exam Countdown Timer</h1>
          <p className="max-w-xl text-sm text-kal-text-secondary leading-relaxed">
            Select your exam. See exactly how much time you have. Share the link with your study group or yourself to stay honest about what's at stake.
          </p>
        </header>

        <div className="kal-glass-card rounded-2xl p-6">
          <Suspense fallback={<div className="text-sm text-kal-muted">Loading...</div>}>
            <ExamCountdownClient />
          </Suspense>
        </div>

        <div className="space-y-3 text-sm text-kal-text-secondary">
          <h2 className="text-base font-semibold text-kal-text">Why looking at the countdown every day helps</h2>
          <p>The biggest cognitive bias in exam preparation is the "I have plenty of time" feeling — even when you don't. Seeing the countdown in days (not "a few months") creates urgency that's difficult to maintain otherwise.</p>
          <p>Share this link with a friend or save it as your phone wallpaper. The number doesn't lie.</p>
        </div>

        <CTABanner
          headline="Track what you do with those days in Kalnehi"
          subtext="Syllabus tracker, daily planner, PrepBrain AI. Start free for 3 days."
        />
      </div>
    </>
  );
}
