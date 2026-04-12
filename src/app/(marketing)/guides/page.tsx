import Link from "next/link";
import {
  BookOpen,
  Brain,
  FileText,
  GraduationCap,
  Landmark,
  School,
} from "lucide-react";

import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";
import { SITE_NAME } from "@/lib/seo-metadata";

export const metadata = marketingPageMetadata({
  path: "/guides",
  title: `Study guides — JEE 2026, NEET 2026, UPSC & Boards | ${SITE_NAME}`,
  description:
    `Free SEO guides: best daily planners for JEE 2026, NEET 2026, UPSC CSE, Board exams, Brain Yoga for exam warriors, and how to stay consistent. Install ${SITE_NAME} as a PWA.`,
});

const guides = [
  {
    href: "/jee-study-planner",
    title: "Best daily planner for JEE 2026",
    blurb:
      "PCM execution: weekly intent, syllabus-linked tasks, timed sessions, and habits for JEE Main & Advanced.",
    icon: GraduationCap,
  },
  {
    href: "/neet-study-planner",
    title: "Best daily planner for NEET 2026",
    blurb:
      "PCB throughput: theory, drills, and mock review without losing your daily rhythm.",
    icon: BookOpen,
  },
  {
    href: "/upsc-study-planner",
    title: "Best daily planner for UPSC CSE",
    blurb:
      "GS, optional, and current affairs mapped into weekly execution — Prelims and Mains phases.",
    icon: Landmark,
  },
  {
    href: "/boards-study-planner",
    title: "Board exam planner",
    blurb:
      "School days alongside competitive prep — routines, todos, and realistic daily plans.",
    icon: School,
  },
  {
    href: "/brain-yoga",
    title: "Brain Yoga for Exam Warriors",
    blurb:
      "Micro-recovery between marathon blocks — breathing, posture, and focus resets.",
    icon: Brain,
  },
  {
    href: "/guides/how-to-maintain-consistency-in-jee-preparation",
    title: "How to maintain consistency in JEE preparation",
    blurb:
      "Blog-style guide: weekly rhythm, mistake review, sleep, and one execution system.",
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
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-kal-accent">
            Guides
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Plan heavy exam years without drowning in tools
          </h1>
          <p className="text-sm leading-relaxed text-kal-text-secondary sm:text-base">
            Landing pages for{" "}
            <strong className="text-kal-text">JEE 2026</strong>,{" "}
            <strong className="text-kal-text">NEET 2026</strong>,{" "}
            <strong className="text-kal-text">UPSC CSE</strong>, Boards, Brain Yoga, and a consistency
            guide — then{" "}
            <Link
              href="/auth"
              className="font-medium text-kal-accent-dark underline-offset-2 hover:underline"
            >
              create a free account
            </Link>{" "}
            to run your daily execution system in {SITE_NAME}.
          </p>
        </header>

        <ul className="mt-10 grid gap-4">
          {guides.map(({ href, title, blurb, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex gap-4 rounded-2xl border border-kal-border bg-kal-card p-4 shadow-kal-card transition-colors hover:border-kal-accent/35"
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
