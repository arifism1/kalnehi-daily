/**
 * Single source of truth for landing FAQ copy (on-page + JSON-LD).
 * Keep in sync with product: trial, exam scope, privacy, AI quotas.
 */
import { SMART_PLAN_MONTHLY_DISPLAY } from "@/lib/smartPlanPricing";

const m = SMART_PLAN_MONTHLY_DISPLAY;

export const LANDING_FAQ_ITEMS = [
  {
    question: "What is Kalnehi Daily?",
    answer:
      "Kalnehi Daily is a web app and installable PWA for serious exam prep: daily planning (voice or typed), syllabus and marks tracking where we have data, focus timer, Revision Tracker, habits, Brain Yoga, doubt logging, Daily Log, and Mastermind. You pick your exam from a broad catalog; the deepest syllabus, marks prediction, and revision workflows tied to microtopic coverage are built out today for JEE Main, NEET UG, and Class 11/12 Boards.",
  },
  {
    question: "How does the trial work?",
    answer:
      `First 3 days are free with no card. After that, Smart Plan is ${m}/month on AutoPay. You choose 1–12 monthly charges up front; the mandate stops when that number is reached. Cancel from settings anytime — no forms or calls.`,
  },
  {
    question: "What exams does Kalnehi Daily support?",
    answer:
      "The in-app catalog lists 27 exam profiles (engineering, medical, management, law, banking, SSC, study abroad, CUET, and an “Other” option). Daily plan, focus timer, habits, doubt tracker, Daily Log, Brain Yoga, and Mastermind work regardless of which exam you pick. The syllabus tracker, marks engine with weightage-backed predictions, and Revision Tracker tied to microtopic coverage are fully built for JEE Main, NEET UG, and Class 11/12 Boards today. For other exams, use the same tools for execution and coaching; chapter-level graphs improve as we ship more syllabus data for that exam.",
  },
  {
    question: "Does the Study Camera upload my handwritten notes anywhere?",
    answer:
      "No. The Study Camera processes everything on your device. Nothing is uploaded or stored on any server. Your notes stay private.",
  },
  {
    question: "How much AI (Mastermind) do I get?",
    answer:
      `The 3-day free trial includes 60,000 Mastermind tokens and 5 minutes of voice dictation — shared across all 3 days. Smart Plan (${m}/month) includes 2 million tokens and 100 minutes of voice every month, both resetting each billing cycle.`,
  },
  {
    question: "Can I cancel at any time?",
    answer:
      "Yes. Cancel from the app settings or payment portal before your next billing date and you will not be charged again. No questions asked.",
  },
  {
    question: "Does Kalnehi Daily analyse my mock test scores?",
    answer:
      "No. Kalnehi Daily tracks your syllabus coverage, daily task execution, and revision — not mock test score sheets or PDF uploads. The Marks Engine predicts scores based on the syllabus you've covered, not past test performance.",
  },
  {
    question: "Does it work offline?",
    answer:
      "Yes. Kalnehi Daily is a PWA (Progressive Web App) and works offline for core features — daily plan, focus timer, and study sessions. AI features like Mastermind require a connection.",
  },
  {
    question: "Is there an Android or iOS app?",
    answer:
      "Kalnehi Daily is a PWA, which means you install it from your browser — no app store required. It works like a native app: home screen icon, full screen, offline support, and push notifications where supported.",
  },
] as const;
