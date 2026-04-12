import Link from "next/link";
import { BookOpen, GraduationCap, School } from "lucide-react";

import { MarketingPageJsonLd } from "@/components/seo/MarketingPageJsonLd";
import { marketingPageMetadata } from "@/lib/marketing-seo";

export const metadata = marketingPageMetadata({
  path: "/guides",
  title: "Study guides — JEE, NEET & Boards | Kalnehi Daily",
  description:
    "Free guides to daily execution for IIT-JEE, NEET-UG, and Board exams. Learn how Kalnehi Daily helps you plan, track syllabus, and install the PWA for focused prep.",
});

const guides = [
  {
    href: "/jee-study-planner",
    title: "JEE study planner",
    blurb:
      "Structure revision for Physics, Chemistry, and Mathematics with weekly intent, deep-work blocks, and habit loops.",
    icon: GraduationCap,
  },
  {
    href: "/neet-study-planner",
    title: "NEET study planner",
    blurb:
      "Balance PCB theory, drills, and mock analysis — without losing sight of your daily output.",
    icon: BookOpen,
  },
  {
    href: "/boards-study-planner",
    title: "Board exam planner",
    blurb:
      "Ship consistent school days alongside competitive prep using routines, todos, and a realistic daily plan.",
    icon: School,
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
            question: "What is Kalnehi Daily?",
            answer:
              "Kalnehi Daily is a web app and installable PWA for Indian exam aspirants: planner, syllabus tracking, study sessions, habits, and optional PrepBrain AI coaching.",
          },
          {
            question: "Do I need to pay to read these guides?",
            answer:
              "No. These guides are public. Creating an account is only required when you open the app to plan and track your own prep.",
          },
          {
            question: "Can I install Kalnehi Daily on Android?",
            answer:
              "Yes. After signing in from Chrome on Android, use Install app or Add to Home screen for a standalone experience with offline-friendly caching.",
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
            Pick a guide below to see how Kalnehi Daily maps to JEE Main & Advanced, NEET-UG, or
            Board exams — then{" "}
            <Link href="/auth" className="font-medium text-kal-accent-dark underline-offset-2 hover:underline">
              create a free account
            </Link>{" "}
            to run your own daily execution system.
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
