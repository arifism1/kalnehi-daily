import { WhatCanKalnehiDoClient } from "@/components/marketing/WhatCanKalnehiDoClient";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/what-can-kalnehi-do",
  title: `What Can Kalnehi Do? — complete feature tour for JEE, NEET & UPSC | ${SITE_NAME}`,
  description: `Every feature of Kalnehi Daily in one place: Daily Plan, Syllabus Mastery Tracker, Execution Planner, Marks Engine, Revision Engine, Focus Timer, Consistency Heatmap, Habit Maker, Brain Yoga, PrepBrain AI, AI voice dictation, Doubt Tracker, Personal Motivation Vault, Daily Log, push notifications and reminders — built for JEE, NEET, UPSC and Boards. Start with a 1-day welcome trial or a 2-day paid trial.`,
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
              "An exam-prep execution app: daily task checklist, syllabus tracking, guided focus resets (Brain Yoga), notifications, study sessions, and optional PrepBrain AI — built for JEE, NEET, UPSC, and Boards.",
          },
          {
            question: "Is there a trial?",
            answer:
              "You can start with a 1-day welcome trial, then a 2-day paid trial from the pricing page, then continue monthly on Pro if it fits.",
          },
          {
            question: "Can I install Kalnehi like an app?",
            answer:
              "Yes. After signing in, install the PWA from your browser for a full-screen study shell and offline-friendly caching.",
          },
        ]}
      />
      <WhatCanKalnehiDoClient />
    </>
  );
}
