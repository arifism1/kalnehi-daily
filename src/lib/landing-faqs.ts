/**
 * Single source of truth for landing FAQ copy (on-page + JSON-LD).
 * Keep in sync with product: trial, exam scope, privacy, AI quotas.
 */
export const LANDING_FAQ_ITEMS = [
  {
    question: "What is Kalnehi Daily?",
    answer:
      "Kalnehi Daily is a web app and installable PWA for serious exam prep: daily planning (voice or typed), syllabus and marks tracking where we have data, focus timer, revision reminders, habits, Brain Yoga, doubt logging, Daily Log, and PrepBrain AI. You pick your exam from a broad catalog; the deepest syllabus, marks prediction, and revision engine are built out today for JEE Main, NEET UG, and Class 11/12 Boards.",
  },
  {
    question: "How does the trial work?",
    answer:
      "Day 1 is completely free — no card required. If you want to keep going, you pay ₹19 to unlock 2 more days (the paid trial). After those 3 days, it's ₹299/month with AutoPay. You can cancel before the paid trial converts — no charge.",
  },
  {
    question: "What exams does Kalnehi support?",
    answer:
      "The in-app catalog lists 27 exam profiles (engineering, medical, management, law, banking, SSC, study abroad, CUET, and an “Other” option). Daily plan, focus timer, habits, doubt tracker, Daily Log, Brain Yoga, and PrepBrain AI work regardless of which exam you pick. The syllabus tracker, marks engine with weightage-backed predictions, and revision engine tied to microtopic coverage are fully built for JEE Main, NEET UG, and Class 11/12 Boards today. For other exams, use the same tools for execution and coaching; chapter-level graphs improve as we ship more syllabus data for that exam.",
  },
  {
    question: "Does the Study Camera upload my handwritten notes anywhere?",
    answer:
      "No. The Study Camera processes everything on your device. Nothing is uploaded or stored on any server. Your notes stay private.",
  },
  {
    question: "How much AI (PrepBrain) do I get?",
    answer:
      "The free day includes 300,000 PrepBrain tokens and 5 minutes of voice dictation. The ₹19 paid trial gives you 500,000 tokens and 15 voice minutes. The monthly plan (₹299) includes 2 million tokens and 60 voice minutes — both reset each billing cycle.",
  },
  {
    question: "Can I cancel at any time?",
    answer:
      "Yes. Cancel from the app settings or payment portal before your next billing date and you will not be charged again. No questions asked.",
  },
  {
    question: "Does Kalnehi analyse my mock test scores?",
    answer:
      "No. Kalnehi tracks your syllabus coverage, daily task execution, and revision — not mock test score sheets or PDF uploads. The Marks Engine predicts scores based on the syllabus you've covered, not past test performance.",
  },
  {
    question: "Does it work offline?",
    answer:
      "Yes. Kalnehi is a PWA (Progressive Web App) and works offline for core features — daily plan, focus timer, and study sessions. AI features like PrepBrain require a connection.",
  },
  {
    question: "Is there an Android or iOS app?",
    answer:
      "Kalnehi is a PWA, which means you install it from your browser — no app store required. It works like a native app: home screen icon, full screen, offline support, and push notifications where supported.",
  },
] as const;
