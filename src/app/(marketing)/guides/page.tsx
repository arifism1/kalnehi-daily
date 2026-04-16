import Link from "next/link";
import {
  BookOpen,
  Brain,
  FileText,
  GraduationCap,
  Landmark,
  Layers,
  School,
  ScrollText,
  Stethoscope,
} from "lucide-react";

import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/guides",
  title: `Study guides — JEE, NEET UG & PG, CUET UG, UPSC CSE, Boards & more | ${SITE_NAME}`,
  description:
    `Public guides: JEE 2026, NEET UG & NEET PG, CUET UG, UPSC CSE, Boards, Brain Yoga, JEE consistency, and a daily prep system for any exam. Read free — run your plan in ${SITE_NAME} (PWA).`,
});

const guides = [
  {
    href: "/jee-study-planner",
    title: "JEE Main & Advanced — daily planner",
    blurb:
      "PCM in one weekly map: syllabus-linked tasks, timed sessions, and habits that survive bad mocks.",
    icon: GraduationCap,
  },
  {
    href: "/neet-study-planner",
    title: "NEET UG — daily planner",
    blurb:
      "PCB without losing the thread: theory, drills, mock review, and a checklist you can actually finish.",
    icon: BookOpen,
  },
  {
    href: "/neet-pg-study-planner",
    title: "NEET PG / INI-CET — study planner",
    blurb:
      "Internship-proof blocks: clinical MCQ revision when your day is already chopped up.",
    icon: Stethoscope,
  },
  {
    href: "/cuet-ug-study-planner",
    title: "CUET UG — study planner",
    blurb:
      "Domain subjects + general test in one rhythm — so neither side quietly dies before the form.",
    icon: Layers,
  },
  {
    href: "/upsc-study-planner",
    title: "UPSC CSE — daily planner",
    blurb:
      "GS, optional, and current affairs in weekly execution — Prelims and Mains without fantasy timetables.",
    icon: Landmark,
  },
  {
    href: "/boards-study-planner",
    title: "Board exams — planner",
    blurb:
      "School + competitive prep: routines, todos, and daily plans that fit real school weeks.",
    icon: School,
  },
  {
    href: "/guides/daily-exam-prep-system-any-exam",
    title: "Daily prep system (any exam)",
    blurb:
      "One loop for JEE, NEET, CUET, UPSC, or anything else: weeks, days, timers, review — no new notebook required.",
    icon: ScrollText,
  },
  {
    href: "/brain-yoga",
    title: "Brain Yoga — short resets",
    blurb:
      "Five-minute recovery between heavy blocks so the next session still has a pulse.",
    icon: Brain,
  },
  {
    href: "/guides/how-to-maintain-consistency-in-jee-preparation",
    title: "Consistency in JEE prep (deep dive)",
    blurb:
      "Weekly rhythm, mistake review, sleep, and restarting after a bad day — written for JEE, useful elsewhere.",
    icon: FileText,
  },
] as const;

export default function GuidesHubPage() {
  return (
    <>
      <MarketingPageJsonLd
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
        ]}
        faqs={[
          {
            question: `What is ${SITE_NAME}?`,
            answer:
              `${SITE_NAME} is a web app and installable PWA for Indian exam aspirants: planner, syllabus tracking, study sessions, habits, and optional PrepBrain AI coaching.`,
          },
          {
            question: "Do I need to pay to read these guides?",
            answer:
              "No. These guides are public. Creating an account is only required when you open the app to plan and track your own prep.",
          },
          {
            question: `Can I install ${SITE_NAME} on Android?`,
            answer:
              "Yes. After signing in from Chrome on Android, use Install app or Add to Home screen for a standalone experience with offline-friendly caching — the same signals Google uses for installable PWAs in search.",
          },
        ]}
      />
      <article>
        <header className="kal-glass-panel mb-8 rounded-2xl px-6 py-8 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-kal-accent">
            Guides
          </p>
          <h1 className="kal-hero-heading">
            Plan heavy exam years without drowning in tools
          </h1>
          <p className="text-sm leading-relaxed text-kal-text-secondary sm:text-base">
            Guides for{" "}
            <strong className="text-kal-text">JEE</strong>,{" "}
            <strong className="text-kal-text">NEET UG</strong>,{" "}
            <strong className="text-kal-text">NEET PG</strong>,{" "}
            <strong className="text-kal-text">CUET UG</strong>,{" "}
            <strong className="text-kal-text">UPSC CSE</strong>, Boards, Brain Yoga, plus a general
            daily prep system for any competitive exam. Read the one that matches you — then{" "}
            <Link
              href="/auth"
              className="font-medium text-kal-accent-dark underline-offset-2 hover:underline"
            >
              get started
            </Link>{" "}
            to run your actual daily prep in {SITE_NAME}.
          </p>
        </header>

        <ul className="mt-4 grid gap-4 sm:grid-cols-2 sm:gap-5">
          {guides.map(({ href, title, blurb, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="kal-glass-card flex h-full gap-4 rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-16px_rgba(255,122,0,0.2)]"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-kal-accent-soft text-kal-accent">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold text-kal-text">{title}</span>
                  <span className="mt-1 block text-sm text-kal-text-secondary">{blurb}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </article>
    </>
  );
}
