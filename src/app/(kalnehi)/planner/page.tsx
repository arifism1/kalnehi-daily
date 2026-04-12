import Link from "next/link";
import { Calendar, CheckSquare, Clock, LineChart, ListTodo, Sparkles } from "lucide-react";

import { kalnehiPageMetadata, SITE_NAME } from "@/lib/seo-metadata";

export const metadata = kalnehiPageMetadata("planner");

const cards = [
  {
    href: "/planner/weekly",
    title: "Weekly planner",
    description: "Map subjects and priorities across the week so every day has a clear lane.",
    icon: Calendar,
  },
  {
    href: "/planner/todos",
    title: "Todos",
    description: "Capture and clear tasks that do not belong on the calendar but still move the needle.",
    icon: ListTodo,
  },
  {
    href: "/planner/routine",
    title: "Routine",
    description: "Shape morning and evening blocks that repeat — the backbone of consistent prep.",
    icon: Clock,
  },
  {
    href: "/planner/schedule",
    title: "Schedule",
    description: "Time-box deep work and classes so your day matches your exam timeline.",
    icon: CheckSquare,
  },
  {
    href: "/planner/habits",
    title: "Planner habits",
    description: "Tie micro-habits to your planner so streaks reinforce the plan, not just motivation.",
    icon: Sparkles,
  },
  {
    href: "/planner/productivity",
    title: "Productivity",
    description: "See where time leaks and tighten execution without burning out.",
    icon: LineChart,
  },
] as const;

export default function PlannerLandingPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-kal-text sm:text-3xl">
          Study planner — built for JEE, NEET & Boards
        </h1>
        <p className="text-sm leading-relaxed text-kal-text-secondary sm:text-base">
          {SITE_NAME} connects your target exam to a weekly rhythm: schedule deep work, manage
          todos, lock routines, and track habits in one installable PWA. Pick a module below to plan
          the layer you need today.
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2">
        {cards.map(({ href, title, description, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex h-full flex-col gap-2 rounded-2xl border border-kal-border bg-kal-card p-4 shadow-kal-card transition-colors hover:border-kal-accent/30 hover:bg-kal-accent-soft/40"
            >
              <span className="flex items-center gap-2 font-semibold text-kal-text">
                <Icon className="h-5 w-5 shrink-0 text-kal-accent" aria-hidden />
                {title}
              </span>
              <span className="text-sm leading-snug text-kal-text-secondary">{description}</span>
            </Link>
          </li>
        ))}
      </ul>

      <section
        className="rounded-2xl border border-kal-border bg-kal-card-muted/60 px-4 py-5 text-sm leading-relaxed text-kal-text-secondary"
        aria-labelledby="planner-seo-more"
      >
        <h2 id="planner-seo-more" className="text-base font-semibold text-kal-text">
          Why a single planner matters for competitive exams
        </h2>
        <p className="mt-3">
          Fragmented notes and scattered apps hide the real bottleneck: execution. {SITE_NAME} keeps
          weekly intent, daily tasks, and habit loops in one place so you can see whether your plan is
          realistic — and fix it before you lose weeks. Install the app on Android for quick access
          from your home screen and fewer distractions than hopping between browser tabs.
        </p>
      </section>
    </div>
  );
}
