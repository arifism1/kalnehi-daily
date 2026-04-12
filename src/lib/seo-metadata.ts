import type { Metadata } from "next";

import { absoluteUrl, getSiteUrl } from "@/lib/site";

export const SITE_NAME = "Kalnehi Daily";
export const SITE_TAGLINE = "Win Daily — JEE, NEET & Boards";

export const OG_IMAGE_PATH = "/icon-512x512.png";

export type KalnehiPageSeoKey =
  | "home"
  | "prepbrain"
  | "brainYoga"
  | "studySessions"
  | "planner"
  | "pricing"
  | "about"
  | "meditation"
  | "syllabus"
  | "dailyPlan"
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
    title: "Kalnehi Daily — JEE, NEET & Boards planner & study app",
    description:
      "Plan every day, track syllabus and marks, build habits, and stay consistent. Kalnehi Daily is the execution planner for serious JEE, NEET, and Boards aspirants — install the PWA and study anywhere.",
  },
  prepbrain: {
    path: "/prepbrain",
    title: "PrepBrain AI — your JEE & NEET study coach",
    description:
      "Ask syllabus-aware questions, get structured help, and stay aligned with your planner. PrepBrain AI in Kalnehi Daily supports high-intensity JEE, NEET, and Boards preparation with context from your routine.",
  },
  brainYoga: {
    path: "/brain-yoga",
    title: "Brain Yoga — focus & calm for exam preparation",
    description:
      "Short, exam-focused mindfulness and breathing routines to reset attention between subjects. Brain Yoga in Kalnehi Daily helps JEE and NEET aspirants manage stress and sustain deep work.",
  },
  studySessions: {
    path: "/study-sessions",
    title: "Study sessions — timed blocks & deep work",
    description:
      "Run focused study sessions with Kalnehi Daily. Track time on task, reduce distraction, and build a repeatable daily rhythm for JEE, NEET, and Boards.",
  },
  planner: {
    path: "/planner",
    title: "Study planner — weekly schedule, todos & habits",
    description:
      "Weekly planner, daily todos, routine builder, and habit loops in one place. Kalnehi Daily turns your target exam into a concrete plan you can execute every day.",
  },
  pricing: {
    path: "/pricing",
    title: "Pricing — Kalnehi Daily Pro & Pro Max",
    description:
      "Simple plans for students who want PrepBrain AI, advanced tracking, and premium execution tools. See Kalnehi Daily pricing for JEE, NEET, and Boards.",
  },
  about: {
    path: "/about",
    title: "About Kalnehi Daily",
    description:
      "Kalnehi Daily helps Indian exam aspirants ship consistent study days — planner, syllabus, habits, and optional AI coaching in one installable web app.",
  },
  meditation: {
    path: "/meditation",
    title: "Meditation & consistency — Kalnehi Daily",
    description:
      "Guided micro-sessions and consistency tools so you can recover focus between tough chapters. Built for JEE, NEET, and Boards schedules.",
  },
  syllabus: {
    path: "/syllabus",
    title: "Syllabus tracker — JEE, NEET & Boards",
    description:
      "Track microtopics, weightage, and completion across your syllabus. Kalnehi Daily connects syllabus progress to daily tasks and marks goals.",
  },
  dailyPlan: {
    path: "/daily-plan",
    title: "Daily plan — ship today’s study list",
    description:
      "Turn your backlog into a realistic daily plan. Kalnehi Daily helps you assign tasks, time, and marks so each day moves the needle on JEE, NEET, or Boards prep.",
  },
  habits: {
    path: "/habits",
    title: "Habits — streaks & routines for exam prep",
    description:
      "Build non-negotiable study habits with streaks and reminders. Kalnehi Daily reinforces the routines that compound into rank-level preparation.",
  },
  timer: {
    path: "/timer",
    title: "Study timer — Pomodoro & exam blocks",
    description:
      "Use Kalnehi Daily’s timer for Pomodoro-style blocks or long exam-style sprints. Stay in flow during JEE, NEET, and Boards revision.",
  },
  motivation: {
    path: "/motivation",
    title: "Motivation wall — daily fuel for aspirants",
    description:
      "Curated motivation and wallpapers to keep execution high on hard days. Part of Kalnehi Daily’s premium study environment.",
  },
  progress: {
    path: "/progress",
    title: "Progress — marks, syllabus & reality check",
    description:
      "See weighted completion, marks projections, and how your daily work maps to your exam goal. Kalnehi Daily turns effort into visible progress for JEE, NEET, and Boards.",
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
    authors: [{ name: "Kalnehi Daily" }],
    keywords: [
      "JEE preparation app",
      "NEET study planner",
      "Boards exam planner",
      "Kalnehi Daily",
      "study PWA",
      "installable study app",
      "Indian competitive exams",
      "daily study planner",
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
