"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { isAiStudyPartnerUiEnabled } from "@/lib/aiStudyPartnerUi";
import { ChevronDown } from "lucide-react";

type FeatureCard = {
  id: string;
  emoji: string;
  title: string;
  tagline: string;
  bullets: string[];
  accent: string;
};

const FEATURES: FeatureCard[] = [
  {
    id: "daily-plan",
    emoji: "✅",
    title: "Today's Plan",
    tagline: "A single checklist for today.",
    bullets: [
      "Tasks you can tick off as you go — edited anytime.",
      "Change or drop items mid-day without starting over.",
      "Keeps one ground truth for what you meant to finish.",
    ],
    accent: "from-emerald-400/25 via-white/40 to-sky-400/20",
  },
  {
    id: "syllabus",
    emoji: "📚",
    title: "Syllabus Tracker",
    tagline: "Chapter and microtopic progress in one place.",
    bullets: [
      "Mark topics done as you go, not from memory.",
      "See weight-heavy chapters where your exam leans hardest.",
      "Feeds the rest of the app so plans match real coverage.",
    ],
    accent: "from-violet-400/25 via-white/40 to-fuchsia-400/15",
  },
  {
    id: "execution-planner",
    emoji: "🎯",
    title: "Execution Planner + Master Today",
    tagline: "Turn broad goals into one completable block.",
    bullets: [
      "Master Today pins the one task you won’t close the app without touching.",
      "Execution planner breaks subjects into concrete blocks.",
      "End of day: done or not — easy to see.",
    ],
    accent: "from-orange-400/25 via-white/40 to-amber-400/20",
  },
  {
    id: "three-planners",
    emoji: "🗣️",
    title: "Ways to Plan Your Day",
    tagline: "Speak or type; same daily list.",
    bullets: [
      "Dictation turns what you say into tasks (quick pass, then edit).",
      "Self Type if you prefer the keyboard.",
      "Smart Plan adds monthly voice minutes on top of Self Type.",
    ],
    accent: "from-violet-400/20 via-white/40 to-pink-400/20",
  },
  {
    id: "focus-timer",
    emoji: "⏱️",
    title: "Focus Timer",
    tagline: "Timed blocks with breaks.",
    bullets: [
      "Log minutes on a subject instead of guessing later.",
      "Built-in short breaks between blocks.",
      "Weekly totals show where time actually went.",
    ],
    accent: "from-amber-400/25 via-white/40 to-yellow-400/20",
  },
  {
    id: "progress",
    emoji: "📈",
    title: "Progress Tracker",
    tagline: "Coverage, tasks, and days at a glance.",
    bullets: [
      "Pulls syllabus %, tasks, and streak-style signals into one view.",
      "Easier to see drift early than to feel it late at night.",
      "Useful when you ask “where did the last two weeks go?”",
    ],
    accent: "from-sky-400/25 via-white/40 to-blue-400/20",
  },
  {
    id: "marks-engine",
    emoji: "🏆",
    title: "Marks Engine & Predictions",
    tagline: "Rough score estimate from syllabus progress.",
    bullets: [
      "Uses weight tables and what you marked done — not past mock PDFs.",
      "Highlights chapters that still carry a lot of marks.",
      "Useful for “what hurts most if I skip this week?”",
    ],
    accent: "from-orange-400/25 via-white/40 to-amber-400/20",
  },
  {
    id: "revision-tracker",
    emoji: "🔄",
    title: "Revision Tracker",
    tagline: "A dated queue instead of “I’ll revise later.”",
    bullets: [
      "Due dates and priority in one list; optional links to syllabus items.",
      "Reschedule when plans slip — items stay visible.",
      "Pair with Today’s Plan when you sit down to work.",
    ],
    accent: "from-teal-400/25 via-white/40 to-cyan-400/20",
  },
  {
    id: "consistency",
    emoji: "🔥",
    title: "Consistency Tracker & Heatmap",
    tagline: "Calendar view of days you studied.",
    bullets: [
      "Heatmap of check-ins — easy to spot long gaps.",
      "Pairs with habits and timer data when you use them.",
      "Honest record beats guessing if you’ve been regular.",
    ],
    accent: "from-lime-400/25 via-white/40 to-emerald-400/20",
  },
  {
    id: "habits",
    emoji: "💪",
    title: "Habit Maker",
    tagline: "Small repeating routines with streaks.",
    bullets: [
      "Sleep, morning review, evening log — whatever you want to repeat.",
      "Streaks are a simple nudge, not a lecture.",
      "Meant for boring-but-useful daily anchors.",
    ],
    accent: "from-yellow-400/25 via-white/40 to-orange-400/20",
  },
  {
    id: "study-sessions",
    emoji: "📷",
    title: "Study Sessions",
    tagline: "Timed sessions; optional on-device camera check-in.",
    bullets: [
      "Start/stop sessions; time accrues toward subjects you tag.",
      "Camera signal stays on device — not uploaded as video.",
      "Good when you want proof-for-yourself that desk time happened.",
    ],
    accent: "from-zinc-400/20 via-white/40 to-slate-400/25",
  },
  {
    id: "brain-yoga",
    emoji: "🧘",
    title: "Brain Yoga / Meditation",
    tagline: "Short guided breaks between subjects.",
    bullets: [
      "Roughly five-minute resets so you don’t stack subjects back-to-back forever.",
      "Optional habit-style tracking if you care about frequency.",
      "Not a replacement for sleep — just a breather tool.",
    ],
    accent: "from-cyan-400/25 via-white/40 to-teal-400/20",
  },
  {
    id: "prepbrain",
    emoji: "🤖",
    title: "Mastermind",
    tagline: "Strategy from the data you already log here.",
    bullets: [
      "Thinks in terms of syllabus %, tasks, marks engine — not generic chat.",
      "For solving individual problems or teaching a chapter start-to-finish, use a general chatbot.",
      "Trial: 60,000 tokens and 5 minutes voice total. Smart Plan: 2 million tokens and 100 minutes voice per month.",
    ],
    accent: "from-indigo-400/25 via-white/40 to-blue-400/20",
  },
  {
    id: "ai-capture",
    emoji: "🎁",
    title: "AI Voice Dictation",
    tagline: "Speak; tasks land in the list.",
    bullets: [
      "One pass of dictation, then tidy titles and times.",
      "You confirm before it counts as the plan.",
      "Trial includes 5 minutes total; Smart Plan raises the monthly cap.",
    ],
    accent: "from-lime-400/20 via-white/40 to-yellow-400/20",
  },
  {
    id: "motivation",
    emoji: "💛",
    title: "Personal Motivation Vault",
    tagline: "Notes and quotes you wrote for yourself.",
    bullets: [
      "Save reasons, targets, lines that actually matter to you.",
      "On bad days, it’s your past self — not a stranger’s essay.",
      "Optional; skip it if that’s not your thing.",
    ],
    accent: "from-pink-400/20 via-white/40 to-orange-400/20",
  },
  {
    id: "notifications",
    emoji: "🔔",
    title: "Push notifications & study reminders",
    tagline: "Reminders when you said you’d need them.",
    bullets: [
      "Time-based nudges you set yourself.",
      "Can tie into habits you’ve already defined.",
      "Works best if you keep notification spam off elsewhere.",
    ],
    accent: "from-amber-400/25 via-white/40 to-orange-400/15",
  },
  {
    id: "doubts",
    emoji: "❓",
    title: "Doubt Tracker",
    tagline: "Jot doubts during study; resolve them later.",
    bullets: [
      "Quick capture so you don’t lose the thread mid-problem.",
      "Review list when you have time or a teacher.",
      "A written doubt is easier to close than a vague memory.",
    ],
    accent: "from-slate-400/20 via-white/40 to-zinc-400/25",
  },
  {
    id: "daily-log",
    emoji: "📝",
    title: "Daily Log",
    tagline: "Short end-of-day note.",
    bullets: [
      "What ran, what hurt, what to carry to tomorrow.",
      "Scroll back weeks later without relying on mood memory.",
      "Keeps a factual trail for you and for Mastermind context.",
    ],
    accent: "from-indigo-400/20 via-white/40 to-violet-400/20",
  },
];

export function WhatCanKalnehiDoClient() {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = useCallback((id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div className="space-y-14 pb-4">
      <section className="relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-white/70 via-white/45 to-kal-accent-soft/30 px-8 py-14 shadow-[0_24px_80px_-32px_rgba(255,122,0,0.35)] backdrop-blur-xl dark:border-white/10 dark:from-zinc-900/80 dark:via-zinc-900/55 dark:to-orange-950/25 dark:shadow-[0_28px_90px_-28px_rgba(0,0,0,0.65)] sm:px-12 sm:py-16">
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-kal-accent/20 blur-3xl motion-safe:animate-pulse"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-12 h-48 w-48 rounded-full bg-sky-400/15 blur-3xl"
          aria-hidden
        />
        <div className="relative space-y-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-kal-accent">
            Quick tour
          </p>
          <h1 className="kal-hero-heading text-balance">
            What Can Kalnehi Daily Do?
          </h1>
          <p className="mx-auto max-w-xl text-pretty text-base font-medium leading-relaxed text-kal-text-secondary sm:text-lg">
            Voice, syllabus, checklist, timer, Mastermind — in one app.
          </p>
          <p className="mx-auto max-w-2xl text-pretty text-sm leading-relaxed text-kal-text-secondary sm:text-[0.95rem]">
            Short descriptions below. Open a card if you want detail on one area.
          </p>
        </div>
      </section>

      <section aria-labelledby="feature-explorer-heading" className="space-y-6">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
          <h2 id="feature-explorer-heading" className="kal-section-heading">
            Every feature
          </h2>
          <p className="text-xs font-medium text-kal-muted sm:text-sm">Tap any card to see what it does</p>
        </div>

        <ul className="grid list-none grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-7">
          {FEATURES.filter((f) => isAiStudyPartnerUiEnabled || f.id !== "study-sessions").map((f) => {
            const expanded = openId === f.id;
            return (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => toggle(f.id)}
                  aria-expanded={expanded}
                  className="group relative w-full rounded-2xl border border-white/45 bg-white/35 text-left shadow-[0_16px_40px_-24px_rgba(0,0,0,0.2)] outline-none backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-kal-accent/45 hover:shadow-[0_22px_50px_-20px_rgba(255,122,0,0.25)] focus-visible:ring-2 focus-visible:ring-kal-accent/50 motion-safe:hover:scale-[1.01] dark:border-white/10 dark:bg-zinc-900/40 dark:hover:border-kal-accent/35"
                >
                  <div
                    className={`pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br opacity-70 transition-opacity duration-300 group-hover:opacity-100 ${f.accent}`}
                    aria-hidden
                  />
                  <div className="relative flex flex-col gap-4 p-6 sm:p-8">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/60 text-2xl shadow-inner ring-1 ring-white/50 dark:bg-zinc-800/80 dark:ring-white/10"
                          aria-hidden
                        >
                          {f.emoji}
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-base font-bold leading-snug text-kal-text sm:text-lg">
                            {f.title}
                          </h3>
                          <p className="mt-1 text-sm leading-snug text-kal-text-secondary">{f.tagline}</p>
                        </div>
                      </div>
                      <ChevronDown
                        className={`mt-1 h-5 w-5 shrink-0 text-kal-accent transition-transform duration-300 ${
                          expanded ? "rotate-180" : "group-hover:translate-y-0.5"
                        }`}
                        aria-hidden
                      />
                    </div>

                    <div
                      className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                        expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <ul className="space-y-2 border-t border-white/30 pt-3 text-sm leading-relaxed text-kal-text-secondary dark:border-white/10">
                          {f.bullets.map((b) => (
                            <li key={b} className="flex gap-2">
                              <span className="text-kal-accent" aria-hidden>
                                ✦
                              </span>
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section
        aria-label="Get started"
        className="sticky bottom-3 z-10 mx-auto flex w-full max-w-lg flex-col gap-3 rounded-2xl border border-kal-accent/35 bg-white/75 p-4 shadow-[0_20px_50px_-24px_rgba(255,122,0,0.4)] backdrop-blur-lg dark:border-kal-accent/25 dark:bg-zinc-900/85 sm:flex-row sm:items-center sm:justify-center sm:p-5"
      >
        <Link
          href="/pricing"
          className="kal-btn-accent min-h-[48px] flex-1 text-center"
        >
          View pricing
        </Link>
        <Link
          href="/auth"
          className="kal-btn-ghost min-h-[48px] flex-1 text-center"
        >
          Sign in
        </Link>
      </section>
    </div>
  );
}
