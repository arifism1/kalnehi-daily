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
      "Kalnehi Daily is a web app and installable PWA — a preparation operating system for serious exam prep: dashboard with syllabus and projected marks where we have data, daily planning (voice or typed), timer and study sessions, missed tasks and backlog, Daily Debrief and recaps, mock test logging, Revision Tracker, Target Score Blueprint, habits, Brain Yoga, doubt and mistake logs, motivation vault, Progress with cohort leaderboard context, and Mastermind. You pick your exam from a broad catalog; the deepest syllabus, marks prediction, and revision workflows tied to microtopic coverage are built out today for JEE Main, NEET UG, and Class 11/12 Boards.",
  },
  {
    question: "How does the trial work?",
    answer:
      `First 7 days are free with no card. After that, Smart Plan is ${m}/month on AutoPay. You choose 1–12 monthly charges up front; the mandate stops when that number is reached. Cancel from settings anytime — no forms or calls.`,
  },
  {
    question: "Can I switch from monthly to 6-month or annual?",
    answer:
      `Yes. Open Pricing and choose the upfront option; after payment succeeds your monthly AutoPay is stopped before your new plan activates. Smart Plan remains ${m}/month if you stay on monthly AutoPay.`,
  },
  {
    question: "What exams does Kalnehi Daily support?",
    answer:
      "The in-app catalog lists 27 exam profiles (engineering, medical, management, law, banking, SSC, study abroad, CUET, and an “Other” option). Daily plan, backlog, missed tasks, debrief, recaps, mock logging, focus timer, habits, doubt tracker, mistake log, motivation vault, Daily Log, Brain Yoga, and Mastermind work regardless of which exam you pick. The syllabus tracker, marks engine with weightage-backed predictions, and Revision Tracker tied to microtopic coverage are fully built for JEE Main, NEET UG, and Class 11/12 Boards today. For other exams, use the same tools for execution and coaching; chapter-level graphs improve as we ship more syllabus data for that exam.",
  },
  {
    question: "Does the Study Camera upload my handwritten notes anywhere?",
    answer:
      "No. The Study Camera processes everything on your device. Nothing is uploaded or stored on any server. Your notes stay private.",
  },
  {
    question: "How much AI (Mastermind) do I get?",
    answer:
      `The 7-day free trial includes 60,000 Mastermind tokens and 5 minutes of voice dictation — shared across all 7 days. Smart Plan (${m}/month) includes 2 million tokens and 100 minutes of voice every month, both resetting each billing cycle.`,
  },
  {
    question: "Can I cancel at any time?",
    answer:
      "Yes. Cancel from the app settings or payment portal before your next billing date and you will not be charged again. No questions asked.",
  },
  {
    question: "Does Kalnehi Daily analyse my mock test scores?",
    answer:
      "You can log mocks in the app — including subject-wise marks where supported — so trends sit next to your plan and progress. Kalnehi does not ingest score PDFs or run OCR on test reports. The Marks Engine predicts scores from your syllabus coverage and weightage data, which is separate from your logged mock series: use both together, but they are not the same model.",
  },
  {
    question: "Does it work offline?",
    answer:
      "Yes. On the website (PWA) and the Android app, core features work offline — daily plan, focus timer, study sessions, habits, and doubts saved on your device. Open once on Wi‑Fi to cache your syllabus. Mastermind and study camera need internet.",
  },
  {
    question: "Is there an Android or iOS app?",
    answer:
      "Kalnehi Daily is on Google Play for Android (companion app). You can also install from Chrome as a PWA — home screen icon, full screen, offline support, and push notifications where supported.",
  },
] as const;
