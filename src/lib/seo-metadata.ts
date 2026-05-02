import type { Metadata } from "next";

import { absoluteUrl, getSiteUrl } from "@/lib/site";
import { SMART_PLAN_MONTHLY_DISPLAY } from "@/lib/smartPlanPricing";

/** Full official product name (SEO, manifest, browser tab, install UI). */
export const SITE_NAME = "Kalnehi Daily - Voice Controlled Exam Prep Tracker";

/** Short brand for tight UI and conversational copy where the full name is heavy. */
export const SITE_BRAND = "Kalnehi Daily";

/**
 * Short label for installed PWA / iOS `apple-mobile-web-app-title` (avoids a long name under
 * the status bar). Matches manifest `short_name` intent.
 */
export const PWA_STANDALONE_DISPLAY_NAME = "Kalnehi";

/** Official support inbox (legal pages, plain email contact). */
export const SUPPORT_EMAIL = "curioversitylearning@gmail.com";
export const SUPPORT_MAILTO_HREF = `mailto:${SUPPORT_EMAIL}`;

export const SITE_TAGLINE = "Voice-first exam prep tracker";

/** Served by [`src/app/opengraph-image.tsx`](src/app/opengraph-image.tsx) (1200×630). */
export const OG_IMAGE_PATH = "/opengraph-image";

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

export type KalnehiPageSeoKey =
  | "home"
  | "prepbrain"
  | "mastermind"
  | "studySessions"
  | "planner"
  | "pricing"
  | "about"
  | "meditation"
  | "syllabus"
  | "targetScoreBlueprint"
  | "myTarget"
  | "dailyPlan"
  | "savedPlans"
  | "habits"
  | "timer"
  | "motivation"
  | "progress"
  | "mySubscription"
  | "waitlist"
  | "waitlist-position"
  | "daily-debrief"
  | "mock-tests"
  | "mistake-log";

const PAGE_SEO: Record<
  KalnehiPageSeoKey,
  { title: string; description: string; path: string; ogDescription?: string }
> = {
  home: {
    path: "/",
    title: `${SITE_NAME} — Voice Controlled Exam Prep Tracker & study app`,
    description:
      `Plan by voice, track syllabus, and log study time in one web app for Indian competitive exams.`,
    ogDescription:
      `Voice planning, syllabus tracking, and Mastermind for JEE, NEET, UPSC, and more.`,
  },
  prepbrain: {
    path: "/prepbrain",
    title: `Mastermind — prep strategy from your data | ${SITE_NAME}`,
    description:
      `Ask what to prioritise and how to pace revision — Mastermind uses the syllabus and activity you log in ${SITE_NAME}.`,
  },
  mastermind: {
    path: "/mastermind",
    title: `Mastermind — prep strategy from your data | ${SITE_NAME}`,
    description:
      `Ask what to prioritise and how to pace revision — Mastermind uses the syllabus and activity you log in ${SITE_NAME}.`,
  },
  studySessions: {
    path: "/study-sessions",
    title: `On-camera study sessions — camera on-device | ${SITE_NAME}`,
    description:
      `Log study time with optional on-camera verification: processing stays on your device — no video upload. Focus tracking for JEE, NEET, and Boards in ${SITE_NAME}.`,
  },
  planner: {
    path: "/planner",
    title: `Study planner — weekly schedule, todos & habits | ${SITE_NAME}`,
    description:
      `Weekly planner, daily todos, routine builder, and habit loops in one place. ${SITE_NAME} turns your target exam into a concrete plan you can execute every day.`,
  },
  pricing: {
    path: "/pricing",
    title: `Pricing — 3-Day Free Trial & Smart Plan | ${SITE_NAME}`,
    description:
      `Start with a 3-day free trial — every feature, no card required. Then ${SMART_PLAN_MONTHLY_DISPLAY}/month with Smart Plan: 2 million Mastermind tokens, 100 minutes voice, marks engine, and rank prediction.`,
  },
  about: {
    path: "/about",
    title: `About | ${SITE_NAME}`,
    description:
      `${SITE_NAME} helps Indian exam aspirants build consistent study days — planner, syllabus, habits, and optional AI coaching in one installable web app.`,
  },
  meditation: {
    path: "/meditation",
    title: `Brain Yoga — guided focus resets for exam prep | ${SITE_NAME}`,
    description:
      `Guided breathing and focus reset sessions to calm anxiety and restore concentration between study blocks. Brain Yoga in ${SITE_NAME} is built for the JEE, NEET, UPSC & Boards schedule.`,
  },
  syllabus: {
    path: "/syllabus",
    title: `Syllabus Tracker — JEE, NEET & Boards | ${SITE_NAME}`,
    description:
      `Track microtopics, weightage, and chapter-level progress across your syllabus. ${SITE_NAME} connects syllabus progress to daily tasks and marks goals.`,
  },
  targetScoreBlueprint: {
    path: "/target-score-blueprint",
    title: `Target Score Blueprint — high-weight chapters for your goal | ${SITE_NAME}`,
    description:
      `Turn a target exam score into a prioritized chapter list using official weight patterns and your current mastery. ${SITE_NAME} helps you focus where marks and gaps meet.`,
  },
  myTarget: {
    path: "/my-target",
    title: `My Target — saved blueprint chapter lists | ${SITE_NAME}`,
    description:
      `Review Target Score Blueprint lists you saved, with the date each was added. ${SITE_NAME} keeps your chapter priorities in one place.`,
  },
  dailyPlan: {
    path: "/daily-plan",
    title: `Today's Plan — live task checklist for exam prep | ${SITE_NAME}`,
    description:
      `Your unified Today's Plan: live tasks with prominent checkboxes, inline edit and delete, Master Today circle, and 3-Day Execution view. ${SITE_NAME} turns each day into concrete progress for JEE, NEET, UPSC & Boards.`,
  },
  savedPlans: {
    path: "/saved-plans",
    title: `Saved Daily Plans — your plan history archive | ${SITE_NAME}`,
    description:
      `Browse all your saved daily plans in a clean date-wise history, with completion percentages and quick task previews. ${SITE_NAME} keeps your last year of planning visible at a glance.`,
  },
  habits: {
    path: "/habits",
    title: `Habit Maker — streaks & routines for exam prep | ${SITE_NAME}`,
    description:
      `Build non-negotiable study habits with streaks and reminders. ${SITE_NAME} reinforces the routines that compound into rank-level preparation.`,
  },
  timer: {
    path: "/timer",
    title: `Study timer — Pomodoro & exam blocks | ${SITE_NAME}`,
    description:
      `Use the timer in ${SITE_NAME} for Pomodoro-style blocks or long exam-style sprints. Stay in flow during JEE, NEET, and Boards revision.`,
  },
  motivation: {
    path: "/motivation",
    title: `Motivation wall — daily fuel for aspirants | ${SITE_NAME}`,
    description:
      `Curated motivation and wallpapers to keep execution high on hard days. Part of the premium study environment in ${SITE_NAME}.`,
  },
  progress: {
    path: "/progress",
    title: `Progress — marks, syllabus & reality check | ${SITE_NAME}`,
    description:
      `See weighted completion, marks projections, and how your daily work maps to your exam goal. ${SITE_NAME} turns effort into visible progress for JEE, NEET, and Boards.`,
  },
  mySubscription: {
    path: "/my-subscription",
    title: `My Subscription — billing & plan details | ${SITE_NAME}`,
    description:
      `View and manage your ${SITE_NAME} subscription: plan status, billing dates, extra AI and voice credits, and upgrade or cancellation options.`,
  },
  waitlist: {
    path: "/waitlist",
    title: `Join the Waitlist — ${SITE_NAME}`,
    description:
      `Join the Kalnehi Daily waitlist. Your spot is locked the moment you sign up. Full access for 3 days when your batch opens.`,
  },
  "waitlist-position": {
    path: "/waitlist/position",
    title: `Your Waitlist Position — ${SITE_NAME}`,
    description:
      `Track your position in the Kalnehi Daily waitlist. See exactly when your batch opens and skip the queue instantly for ₹19.`,
  },
  "daily-debrief": {
    path: "/daily-debrief",
    title: `Daily Debrief — end-of-day reflection | ${SITE_NAME}`,
    description:
      `60-second end-of-day check-in: log what you finished, what you skipped, and tomorrow's top priority. ${SITE_NAME} surfaces patterns over time.`,
  },
  "mock-tests": {
    path: "/mock-tests",
    title: `Mock Test Tracker — score trends by subject | ${SITE_NAME}`,
    description:
      `Log every mock test with per-subject scores and track your performance over time. Works for NEET, JEE, UPSC, CAT, CA Final, and any exam.`,
  },
  "mistake-log": {
    path: "/mistake-log",
    title: `Mistake Log — error pattern tracker | ${SITE_NAME}`,
    description:
      `Log every mistake with 4-type taxonomy: Knowledge Gap, Application Error, Careless, Time Pressure. ${SITE_NAME} reveals your real bottleneck across any exam.`,
  },
};

export function kalnehiPageMetadata(key: KalnehiPageSeoKey): Metadata {
  const page = PAGE_SEO[key];
  const url = absoluteUrl(page.path);
  const ogImage = absoluteUrl(OG_IMAGE_PATH);

  return {
    title: {
      absolute: page.title,
    },
    description: page.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      url,
      title: page.title,
      description: page.ogDescription ?? page.description,
      siteName: SITE_NAME,
      locale: "en_IN",
      images: [
        {
          url: ogImage,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.ogDescription ?? page.description,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function defaultSiteMetadata(): Pick<
  Metadata,
  "metadataBase" | "title" | "description" | "applicationName" | "keywords" | "authors" | "openGraph" | "twitter" | "category"
> {
  const base = getSiteUrl();
  const desc = PAGE_SEO.home.description;
  const ogImage = absoluteUrl(OG_IMAGE_PATH);

  return {
    metadataBase: new URL(`${base}/`),
    title: {
      default: PAGE_SEO.home.title,
      template: `%s | ${SITE_NAME}`,
    },
    description: desc,
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME }],
    keywords: [
      "voice controlled exam prep",
      "voice study planner",
      "dictate study plan",
      "Smart Exam Prep planner",
      "Smart Exam Prep study app",
      "exam prep PWA",
      SITE_BRAND,
      "exam prep tracker",
      "study PWA",
      "installable study app",
      "Indian competitive exams",
      "daily study planner",
      "syllabus tracker",
      "execution planner app",
    ],
    category: "education",
    openGraph: {
      type: "website",
      url: base,
      title: PAGE_SEO.home.title,
      description: desc,
      siteName: SITE_NAME,
      locale: "en_IN",
      images: [
        {
          url: ogImage,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: PAGE_SEO.home.title,
      description: desc,
      images: [ogImage],
    },
  };
}
