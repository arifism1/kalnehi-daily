"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
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
    tagline: "Most students lose the day before 10am. This stops that.",
    bullets: [
      "Your tasks for today — live, tickable, honest. Not a schedule you pretend to follow.",
      "Edit or delete mid-day when life happens. The plan bends so you don't break.",
      "Every tick is real progress, not the feeling of progress.",
    ],
    accent: "from-emerald-400/25 via-white/40 to-sky-400/20",
  },
  {
    id: "syllabus",
    emoji: "📚",
    title: "Syllabus Tracker",
    tagline: "You've been studying. But do you know what you've actually covered? Most don't.",
    bullets: [
      "Track every subject, chapter, and microtopic — not just the ones that feel done.",
      "Most toppers know which 15% of the syllabus decides their rank. This shows you yours.",
      "Connects directly to your daily plan so what you study actually moves the needle.",
    ],
    accent: "from-violet-400/25 via-white/40 to-fuchsia-400/15",
  },
  {
    id: "execution-planner",
    emoji: "🎯",
    title: "Execution Planner + Master Today",
    tagline: "Knowing what to study and actually doing it are two different things. This is the bridge.",
    bullets: [
      "Master Today keeps your one non-negotiable task in front of you until it's done.",
      "The execution planner turns a vague 'study Physics' into a specific, completable block.",
      "At the end of the day you either did it or you didn't — no grey area.",
    ],
    accent: "from-orange-400/25 via-white/40 to-amber-400/20",
  },
  {
    id: "three-planners",
    emoji: "🗣️",
    title: "Ways to Plan Your Day",
    tagline: "Talk or type. The plan gets in — your way, every time.",
    bullets: [
      "Dictate your plan out loud and the app parses it into tasks. Takes 90 seconds.",
      "Prefer typing? Self Type puts you in full control.",
      "Both flow into the same daily list — Smart Plan unlocks voice dictation alongside Self Type.",
    ],
    accent: "from-violet-400/20 via-white/40 to-pink-400/20",
  },
  {
    id: "focus-timer",
    emoji: "⏱️",
    title: "Focus Timer",
    tagline: "You think you studied for 4 hours. The timer knows the truth.",
    bullets: [
      "Run timed blocks and see real minutes on real subjects — not time in the room.",
      "Short breaks built in so you don't crash at 2pm and lose the evening.",
      "After a week you know exactly how long you actually give each subject.",
    ],
    accent: "from-amber-400/25 via-white/40 to-yellow-400/20",
  },
  {
    id: "progress",
    emoji: "📈",
    title: "Progress Tracker",
    tagline: "Stop guessing how prepared you are. See it.",
    bullets: [
      "Your prep health in one view — syllabus coverage, tasks done, days spent.",
      "Most students feel behind because they have no idea how far they've come.",
      "Numbers don't lie. When you see progress, you keep going.",
    ],
    accent: "from-sky-400/25 via-white/40 to-blue-400/20",
  },
  {
    id: "marks-engine",
    emoji: "🏆",
    title: "Marks Engine & Predictions",
    tagline: "The chapters you skipped aren't hiding. Here's exactly what they're costing you.",
    bullets: [
      "Enter your syllabus progress and see a predicted score — before the exam.",
      "Weightage data baked in so you know if skipping Thermodynamics is actually safe.",
      "Spend your next 30 days on what moves your rank, not what feels urgent.",
    ],
    accent: "from-orange-400/25 via-white/40 to-amber-400/20",
  },
  {
    id: "revision-reminders",
    emoji: "🔄",
    title: "Revision reminders",
    tagline: "A dated queue beats a vague promise to \"revise later.\"",
    bullets: [
      "Due dates, priorities, and optional links to syllabus microtopics — in one list.",
      "Reschedule when life happens; nothing falls off the radar silently.",
      "Pair with your daily plan when you are ready to execute.",
    ],
    accent: "from-teal-400/25 via-white/40 to-cyan-400/20",
  },
  {
    id: "consistency",
    emoji: "🔥",
    title: "Consistency Tracker & Heatmap",
    tagline: "One missed day is fine. Ten missed days with no record of it is how ranks slip.",
    bullets: [
      "A heatmap of every day you showed up. Green squares don't lie.",
      "The students who top aren't smarter — they just have fewer white squares.",
      "Seeing your own pattern is the first step to changing it.",
    ],
    accent: "from-lime-400/25 via-white/40 to-emerald-400/20",
  },
  {
    id: "habits",
    emoji: "💪",
    title: "Habit Maker",
    tagline: "The difference between a 99 percentiler and you isn't talent. It's what they do every day without thinking.",
    bullets: [
      "Build the small non-negotiables — sleep time, morning review, evening recap.",
      "Streaks make habits stick. Breaking a 14-day streak hurts enough to keep you honest.",
      "A good day in exam prep is 90% habits, 10% inspiration.",
    ],
    accent: "from-yellow-400/25 via-white/40 to-orange-400/20",
  },
  {
    id: "study-sessions",
    emoji: "📷",
    title: "Study Sessions",
    tagline: "The session you didn't log? It might as well not have happened.",
    bullets: [
      "Start a timed study session and watch your actual desk time accumulate.",
      "Optional on-device verification helps keep desk time honest — nothing is uploaded.",
      "A week of logged sessions tells you more about your prep than a month of feelings.",
    ],
    accent: "from-zinc-400/20 via-white/40 to-slate-400/25",
  },
  {
    id: "brain-yoga",
    emoji: "🧘",
    title: "Brain Yoga / Meditation",
    tagline: "You can't study for 8 hours straight. Nobody can. This makes 5 hours feel like 8.",
    bullets: [
      "5-minute guided resets between subjects so you don't arrive at chapter 3 already fried.",
      "Track how often you recover — consistency in breaks is as important as study time.",
      "The students who last the whole year are the ones who take recovery seriously.",
    ],
    accent: "from-cyan-400/25 via-white/40 to-teal-400/20",
  },
  {
    id: "prepbrain",
    emoji: "🤖",
    title: "Mastermind",
    tagline: "A tutor who knows your syllabus, your weak spots, and your plan — not just the textbook.",
    bullets: [
      "Ask questions in the context of what you're actually preparing for, not generically.",
      "Answers connected to your syllabus coverage, so advice is specific, not generic.",
      "Smart Plan includes 2 million Mastermind tokens and 100 minutes of voice per month. 3-day free trial with every new account — no card required.",
    ],
    accent: "from-indigo-400/25 via-white/40 to-blue-400/20",
  },
  {
    id: "ai-capture",
    emoji: "🎁",
    title: "AI Voice Dictation",
    tagline: "Your voice, your ideas — structured into tasks in seconds, not minutes.",
    bullets: [
      "Talk out your day in one breath — voice dictation turns speech into a structured task list.",
      "Edit times and titles before you commit — you stay in control.",
      "Your 3-day free trial includes voice time (5 min) so you can feel it before you subscribe.",
    ],
    accent: "from-lime-400/20 via-white/40 to-yellow-400/20",
  },
  {
    id: "motivation",
    emoji: "💛",
    title: "Personal Motivation Vault",
    tagline: "There will be a day when nothing works. This is what you built for exactly that day.",
    bullets: [
      "Save your own reasons, your targets, your best quotes — the things that actually move you.",
      "On a bad day, open this. It's your voice, not a stranger's.",
      "Most students quit not because it's too hard but because they forgot why they started.",
    ],
    accent: "from-pink-400/20 via-white/40 to-orange-400/20",
  },
  {
    id: "notifications",
    emoji: "🔔",
    title: "Push notifications & study reminders",
    tagline: "You meant to revise Electrostatics on Wednesday. Wednesday came and went.",
    bullets: [
      "Set reminders that fire when you actually need them, not when an alarm goes off.",
      "Automated nudges for habits you've committed to — no setup every day.",
      "A well-timed ping at 6pm saves more rank than a motivational poster ever will.",
    ],
    accent: "from-amber-400/25 via-white/40 to-orange-400/15",
  },
  {
    id: "doubts",
    emoji: "❓",
    title: "Doubt Tracker",
    tagline: "Every doubt you left unresolved is a question you'll get wrong in the exam. Log it here, kill it later.",
    bullets: [
      "Capture the doubt mid-session and stay in flow. Come back to it with full focus later.",
      "A logged doubt has a chance of getting solved. A mental note does not.",
      "Most exam mistakes are doubts that never got written down.",
    ],
    accent: "from-slate-400/20 via-white/40 to-zinc-400/25",
  },
  {
    id: "daily-log",
    emoji: "📝",
    title: "Daily Log",
    tagline: "A 2-minute note tonight is the reason you'll understand week 8 when week 8 feels impossible.",
    bullets: [
      "Record what you did, what felt hard, what you'll carry into tomorrow.",
      "Scroll back after a month and see a student who's come further than they think.",
      "The log turns experience into pattern. Pattern into decisions. Decisions into rank.",
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
            Quick tour ✨
          </p>
          <h1 className="kal-hero-heading text-balance">
            What Can Kalnehi Daily Do?
          </h1>
          <p className="mx-auto max-w-xl text-pretty text-base font-medium leading-relaxed text-kal-text-secondary sm:text-lg">
            Your voice-controlled exam prep companion
          </p>
          <p className="mx-auto max-w-2xl text-pretty text-sm leading-relaxed text-kal-text-secondary sm:text-[0.95rem]">
            Every feature, built for one thing — helping you show up, stay sharp, and actually finish what you started. Tap a card to see what it does.
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
          {FEATURES.map((f) => {
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
