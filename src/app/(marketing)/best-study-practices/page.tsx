import { BestStudyPracticesClient } from "@/components/marketing/BestStudyPracticesClient";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/best-study-practices",
  title: `Best Study Practices for JEE, NEET & UPSC — Backed by IIT, AIIMS, Stanford & Harvard | ${SITE_NAME}`,
  description: `Discover evidence-based study practices proven by IIT Bombay, AIIMS Delhi, Stanford, and Harvard research — and how Kalnehi Daily builds every one of them into your daily exam prep routine. Daily planning, syllabus tracking, Brain Yoga, execution signals, smart reminders, voice capture, and personalised AI insights.`,
});

export default function BestStudyPracticesPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Best Study Practices", path: "/best-study-practices" },
        ]}
        faqs={[
          {
            question: "Are these study practices actually backed by research?",
            answer:
              "Yes. Every practice on this page cites peer-reviewed studies or institutional research from organisations like IIT Bombay, AIIMS Delhi, Stanford University, Harvard, NYU, and the University of Chicago. We link to the core citations for each feature.",
          },
          {
            question: "How does Kalnehi Daily implement these practices?",
            answer:
              "Kalnehi Daily is an exam-prep execution app built around proven learning science: a written daily checklist (goal-setting research), syllabus progress tracking (self-regulated learning), Brain Yoga guided resets (mindfulness research), execution signals (implementation intentions), smart reminders (spaced repetition), AI voice capture (dual coding), and PrepBrain AI insights (personalised tutoring research).",
          },
          {
            question: "Is there a free trial to experience all these features?",
            answer:
              "Yes. New accounts get a 3-day free trial with every feature unlocked — including PrepBrain AI (60,000 tokens) and 5 minutes of voice. After 3 days, subscribe to Smart Plan (₹399/month) to keep full access.",
          },
          {
            question: "Which exams is Kalnehi Daily designed for?",
            answer:
              "Kalnehi Daily is built for JEE (Mains and Advanced), NEET UG, UPSC CSE, and Boards. The syllabus tracker, marks engine, and study practices apply equally to all four.",
          },
        ]}
      />

      <Breadcrumbs items={[
          { name: "Home", path: "/" },
          { name: "Best Study Practices", path: "/best-study-practices" },
        ]} className="mb-2" />
      <BestStudyPracticesClient />
    </>
  );
}
