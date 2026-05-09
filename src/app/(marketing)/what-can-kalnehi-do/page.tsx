import { WhatCanKalnehiDoClient } from "@/components/marketing/WhatCanKalnehiDoClient";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SMART_PLAN_MONTHLY_DISPLAY } from "@/lib/smartPlanPricing";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/what-can-kalnehi-do",
  title: `What Can Kalnehi Daily Do? — complete feature tour for JEE, NEET & UPSC | ${SITE_NAME}`,
  description: `Plain-language tour of Kalnehi Daily: daily plan, syllabus tracker, timer, habits, Mastermind, voice dictation, and the rest. Three-day free trial, no card.`,
});

export default function WhatCanKalnehiDoPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "What Can Kalnehi Daily Do?", path: "/what-can-kalnehi-do" },
        ]}
        faqs={[
          {
            question: "What is Kalnehi Daily?",
            answer:
              "An exam-prep execution app: daily task checklist, syllabus tracking, guided focus resets (Brain Yoga), notifications, study sessions, and optional Mastermind — built for JEE, NEET, UPSC, and Boards.",
          },
          {
            question: "Is there a trial?",
            answer:
              `New accounts get 7 days free — no card. After that, Smart Plan is ${SMART_PLAN_MONTHLY_DISPLAY}/month if you want to continue.`,
          },
          {
            question: "Can I install Kalnehi Daily like an app?",
            answer:
              "Yes. After signing in, install the PWA from your browser for a full-screen study shell and offline-friendly caching.",
          },
        ]}
      />

      <Breadcrumbs items={[
          { name: "Home", path: "/" },
          { name: "What Can Kalnehi Daily Do?", path: "/what-can-kalnehi-do" },
        ]} className="mb-2" />
      <WhatCanKalnehiDoClient />
    </>
  );
}
