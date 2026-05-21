"use client";

import Link from "next/link";
import { Calendar, CheckSquare, Clock, LineChart, ListTodo, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { resolveEffectiveEnabledFeatures } from "@/lib/dashboardFeatures";
import { useEnabledFeaturesStore } from "@/store/useEnabledFeaturesStore";

type PlannerModuleCard = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

const PLANNER_MODULES: PlannerModuleCard[] = [
  {
    href: "/planner/weekly",
    title: "Weekly planner",
    description:
      "Map subjects and priorities across the week so every day has a clear lane.",
    icon: Calendar,
  },
  {
    href: "/planner/todos",
    title: "Todos",
    description:
      "Capture and clear tasks that do not belong on the calendar but still move the needle.",
    icon: ListTodo,
  },
  {
    href: "/planner/routine",
    title: "Routine",
    description:
      "Shape morning and evening blocks that repeat — the backbone of consistent prep.",
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
    description:
      "Tie micro-habits to your planner so streaks reinforce the plan, not just motivation.",
    icon: Sparkles,
  },
  {
    href: "/planner/productivity",
    title: "Productivity",
    description: "See where time leaks and tighten execution without burning out.",
    icon: LineChart,
  },
];

export function PlannerLandingModules() {
  const storedFeatures = useEnabledFeaturesStore((s) => s.enabledFeatures);
  const effective = resolveEffectiveEnabledFeatures(storedFeatures);

  const visibleCards = PLANNER_MODULES.filter(
    (c) => c.href !== "/planner/habits" || effective.includes("habit-maker"),
  );

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {visibleCards.map(({ href, title, description, icon: Icon }) => (
        <li key={href}>
          <Link
            href={href}
            className="flex h-full flex-col gap-2 kal-glass-card rounded-2xl p-4 transition-colors hover:border-kal-accent/30 hover:bg-kal-accent-soft/40"
          >
            <span className="flex items-center gap-2 font-semibold text-kal-text">
              <Icon className="size-5 shrink-0 text-kal-accent" aria-hidden />
              {title}
            </span>
            <span className="text-sm leading-snug text-kal-text-secondary">{description}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
