import type { Metadata } from "next";

import { absoluteUrl, getSiteUrl } from "@/lib/site";

/** Full official product name (SEO, manifest, browser tab, install UI). */
export const SITE_NAME = "Kalnehi Daily - Exam Prep Tracker";

/** Short brand for tight UI and conversational copy where the full name is heavy. */
export const SITE_BRAND = "Kalnehi Daily";

export const SITE_TAGLINE = "Win Daily — Smart Exam Prep";

export const OG_IMAGE_PATH = "/icon-512x512.png";

export type KalnehiPageSeoKey =
  | "home"
  | "prepbrain"
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
  | "progress";

const PAGE_SEO: Record<
  KalnehiPageSeoKey,
  { title: string; description: string; path: string }
> = {
  home: {
    path: "/",
    title: `${SITE_NAME} — Smart Exam Prep planner & study app`,
    description:
      `Daily Plan with live task tracking, Syllabus Mastery Tracker, Brain Yoga focus resets, push Notifications, PrepBrain AI coaching (Basic paid trial includes a sample of voice minutes), habits, and progress analytics — ${SITE_NAME} is the complete execution planner for Smart Exam Prep. Install the PWA and study anywhere.`,
  },
  prepbrain: {
    path: "/prepbrain",
    title: `PrepBrain AI — syllabus-aware study coach | ${SITE_NAME}`,
    description:
      `Ask syllabus-aware questions, get structured help, and stay aligned with your planner. PrepBrain AI in ${SITE_NAME} uses your tracked syllabus, schedule, and study rhythm so answers stay concrete.`,
  },
  studySessions: {
    path: "/study-sessions",
    title: `Study sessions — timed blocks & deep work | ${SITE_NAME}`,
    description:
      `Run focused study sessions with ${SITE_NAME}. Track time on task, reduce distraction, and build a repeatable daily rhythm for JEE, NEET, and Boards.`,
  },
  planner: {
    path: "/planner",
    title: `Study planner — weekly schedule, todos & habits | ${SITE_NAME}`,
    description:
      `Weekly planner, daily todos, routine builder, and habit loops in one place. ${SITE_NAME} turns your target exam into a concrete plan you can execute every day.`,
  },
  pricing: {
    path: "/pricing",
    title: `Pricing — Pro | ${SITE_NAME}`,
    description:
      `Simple plans for students who want PrepBrain AI, advanced tracking, and premium execution tools. See ${SITE_NAME} pricing for JEE, NEET, and Boards.`,
  },
  about: {
    path: "/about",
    title: `About | ${SITE_NAME}`,
    description:
      `${SITE_NAME} helps Indian exam aspirants ship consistent study days — planner, syllabus, habits, and optional AI coaching in one installable web app.`,
  },
  meditation: {
    path: "/meditation",
    title: `Brain Yoga — guided focus resets for exam prep | ${SITE_NAME}`,
    description:
      `Guided breathing and focus reset sessions to calm anxiety and restore concentration between study blocks. Brain Yoga in ${SITE_NAME} is built for the JEE, NEET, UPSC & Boards schedule.`,
  },
  syllabus: {
    path: "/syllabus",
    title: `Syllabus Mastery Tracker — JEE, NEET & Boards | ${SITE_NAME}`,
    description:
      `Track microtopics, weightage, and chapter-level mastery across your syllabus. ${SITE_NAME} connects syllabus progress to daily tasks and marks goals.`,
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
    title: `Daily Plan — live task checklist for exam prep | ${SITE_NAME}`,
    description:
      `Your unified Daily Plan: live tasks with prominent checkboxes, inline edit and delete, Master Today circle, and 3-Day Execution view. ${SITE_NAME} turns each day into concrete progress for JEE, NEET, UPSC & Boards.`,
  },
  savedPlans: {
    path: "/saved-plans",
    title: `Saved Daily Plans — your plan history archive | ${SITE_NAME}`,
    description:
      `Browse all your saved daily plans in a clean date-wise history, with completion percentages and quick task previews. ${SITE_NAME} keeps your last year of planning visible at a glance.`,
  },
  habits: {
    path: "/habits",
    title: `Habits — streaks & routines for exam prep | ${SITE_NAME}`,
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
      description: page.description,
      siteName: SITE_NAME,
      locale: "en_IN",
      images: [
        {
          url: ogImage,
          width: 512,
          height: 512,
          alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
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
          width: 512,
          height: 512,
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
