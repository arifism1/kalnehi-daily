import { WhatCanKalnehiDoClient } from "@/components/marketing/WhatCanKalnehiDoClient";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/what-can-kalnehi-do",
  title: `What Can Kalnehi Do? — complete feature tour for JEE, NEET & UPSC | ${SITE_NAME}`,
  description: `Every feature of Kalnehi Daily in one place: Daily Plan, Syllabus Tracker, Execution Planner, Marks Engine, Revision Reminders, Focus Timer, Consistency Heatmap, Habit Maker, Brain Yoga, Mastermind, AI voice dictation, Doubt Tracker, Personal Motivation Vault, Daily Log, push notifications and reminders — built for JEE, NEET, UPSC and Boards. Start with a 3-day free trial, no card required.`,
});

export default function WhatCanKalnehiDoPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "What Can Kalnehi Do?", path: "/what-can-kalnehi-do" },
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
              "New accounts get a 3-day free trial — every feature unlocked, no card required. After 3 days, subscribe to Smart Plan (₹399/month) to continue.",
          },
          {
            question: "Can I install Kalnehi like an app?",
            answer:
              "Yes. After signing in, install the PWA from your browser for a full-screen study shell and offline-friendly caching.",
          },
        ]}
      />

      <Breadcrumbs items={[
          { name: "Home", path: "/" },
          { name: "What Can Kalnehi Do?", path: "/what-can-kalnehi-do" },
        ]} className="mb-2" />
      <WhatCanKalnehiDoClient />
    </>
  );
}
