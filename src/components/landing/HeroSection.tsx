"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { SMART_PLAN_MONTHLY_DISPLAY } from "@/lib/smartPlanPricing";

export function HeroSection() {
  return (
    <section className="relative min-h-[88vh] overflow-hidden bg-kal-page">
      {/* Subtle grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(var(--kal-landing-hero-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--kal-landing-hero-grid-line) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Warm radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 70% 40%, var(--kal-landing-hero-radial) 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto flex min-h-[88vh] max-w-7xl flex-col items-center px-6 lg:flex-row lg:items-center lg:gap-16 lg:px-8">
        {/* Left — text */}
        <div className="flex flex-1 flex-col items-start justify-center pb-8 pt-24 lg:pb-0 lg:pt-0 lg:max-w-[50%]">
          <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.25em] text-kal-muted">
            Prep OS for Indian &amp; international competitive exams
          </p>

          <h1
            className="mb-5 text-[2.6rem] font-normal leading-[1.06] tracking-tight text-kal-text sm:text-5xl lg:text-[3.5rem]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Win daily.
            <br />
            <em className="not-italic text-kal-accent">Rank higher.</em>
          </h1>

          <p className="mb-8 max-w-lg text-lg leading-relaxed text-kal-text-secondary">
            Kalnehi Daily connects your dashboard, syllabus at microtopic level, and marks you should expect from recent exam weightages — then powers your day with voice or typed planning, timers, backlog, and Mastermind as your strategic coach.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/auth"
              className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-kal-accent px-8 text-base font-bold text-white shadow-[0_4px_20px_rgba(255,122,0,0.35)] transition hover:brightness-105 active:scale-[0.99]"
            >
              Start free — 7 days on us
            </Link>
            <Link
              href="/what-can-kalnehi-do"
              className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-kal-border bg-kal-card px-6 text-base font-semibold text-kal-text backdrop-blur-sm transition hover:border-kal-accent/30 hover:bg-kal-bg-elevated active:scale-[0.99]"
            >
              See all features
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>

          <p className="mt-3 text-xs text-kal-muted">
            No card · 7 days fully free · Then {SMART_PLAN_MONTHLY_DISPLAY}/month · Cancel anytime
          </p>
        </div>

        {/* Right — dashboard mockup */}
        <div className="relative flex flex-1 items-center justify-center py-10 lg:py-0 lg:justify-end">
          <div className="relative w-full max-w-[480px]">
            {/* Floating subject icons — decorative */}
            <div className="absolute -left-10 top-16 z-10 hidden lg:block" aria-hidden>
              <div className="flex size-11 items-center justify-center rounded-full border border-kal-accent/25 bg-kal-card text-lg shadow-md backdrop-blur-sm">
                ⚛
              </div>
            </div>
            <div className="absolute -left-6 top-36 z-10 hidden lg:block" aria-hidden>
              <div className="flex size-9 items-center justify-center rounded-full border border-kal-accent/20 bg-kal-card text-base shadow-sm backdrop-blur-sm opacity-80">
                ∑
              </div>
            </div>
            <div className="absolute -right-8 bottom-20 z-10 hidden lg:block" aria-hidden>
              <div className="flex size-10 items-center justify-center rounded-full border border-emerald-600/30 bg-kal-card text-base shadow-md backdrop-blur-sm dark:border-emerald-400/35">
                🌿
              </div>
            </div>
            <div className="absolute -left-12 bottom-16 z-10 hidden xl:block" aria-hidden>
              <div className="flex size-9 items-center justify-center rounded-full border border-kal-accent/15 bg-kal-card text-base shadow-sm backdrop-blur-sm opacity-60">
                ⚗
              </div>
            </div>

            {/* Main dashboard card */}
            <div className="overflow-hidden rounded-2xl border border-kal-border bg-kal-card shadow-[0_24px_64px_-12px_rgba(14,21,37,0.18),0_4px_16px_rgba(100,75,40,0.08)] backdrop-blur-sm dark:shadow-[0_24px_64px_-12px_rgba(0,0,0,0.45),0_4px_16px_rgba(0,0,0,0.25)]">
              <DashboardMockup />
            </div>

            {/* Floating PrepBrain card */}
            <div className="absolute -right-4 -top-6 z-10 w-52 rounded-2xl border border-indigo-500/20 bg-kal-card p-3.5 shadow-[0_8px_24px_rgba(99,102,241,0.14)] backdrop-blur-xl dark:border-indigo-400/25 dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
              <div className="flex items-start gap-2">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] dark:bg-indigo-950/60" aria-hidden>
                  🤖
                </div>
                <div>
                  <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300">Mastermind</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-kal-muted">
                    "Your Physics coverage is 61% — focus on Optics this week."
                  </p>
                </div>
              </div>
            </div>

            {/* Floating streak card */}
            <div className="absolute -bottom-4 -left-4 z-10 flex items-center gap-2.5 rounded-2xl border border-kal-accent/20 bg-kal-card px-4 py-3 shadow-[0_8px_24px_rgba(255,122,0,0.12)] backdrop-blur-xl dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
              <span className="text-xl" aria-hidden>🔥</span>
              <div>
                <p className="text-sm font-bold text-kal-text">14-day streak</p>
                <p className="text-[10px] text-kal-muted">You showed up today</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-20"
        style={{ background: "linear-gradient(to bottom, transparent, var(--kal-page))" }}
      />
    </section>
  );
}

function DashboardMockup() {
  return (
    <div className="p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-kal-muted">Good morning</p>
          <p
            className="text-lg font-bold text-kal-text"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Ananya
          </p>
        </div>
        <p className="text-[10px] font-medium text-kal-accent">
          "Small daily wins stack into rank."
        </p>
      </div>

      {/* Reality Snapshot */}
      <div className="mb-3 rounded-xl border border-kal-border bg-kal-accent-soft p-3">
        <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-kal-muted">
          Reality Snapshot
        </p>
        <div className="flex items-center gap-3">
          {/* Ring */}
          <div className="relative flex size-14 shrink-0 items-center justify-center">
            <svg className="size-14 -rotate-90" viewBox="0 0 56 56" aria-hidden>
              <circle cx="28" cy="28" r="23" fill="none" stroke="var(--kal-border)" strokeWidth="4" />
              <circle
                cx="28" cy="28" r="23" fill="none" stroke="var(--kal-accent)" strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 23}`}
                strokeDashoffset={`${2 * Math.PI * 23 * 0.39}`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute text-[10px] font-bold text-kal-accent">61%</span>
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-kal-text">Predicted: 438 / 720</p>
            <p className="mt-0.5 text-[10px] text-kal-muted">Microtopic syllabus · 61% covered</p>
            <p className="mt-0.5 text-[9px] leading-snug text-kal-muted/90">
              Lines for recent years&apos; patterns (where your exam has data)
            </p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-kal-border">
              <div className="h-full w-[61%] rounded-full bg-kal-accent" aria-hidden />
            </div>
          </div>
        </div>
      </div>

      {/* 3-Day Strip */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        {[
          { label: "Yesterday", tasks: 4, done: 4, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Today", tasks: 5, done: 2, color: "text-kal-accent" },
          { label: "Tomorrow", tasks: 4, done: 0, color: "text-kal-muted" },
        ].map(({ label, tasks, done, color }) => (
          <div key={label} className="rounded-xl border border-kal-border bg-kal-card-muted p-2.5 text-center backdrop-blur-sm">
            <p className="text-[9px] font-bold uppercase text-kal-muted">{label}</p>
            <p className={`mt-1 text-lg font-bold tabular-nums leading-none ${color}`} style={{ fontFamily: "var(--font-display)" }}>
              {done}/{tasks}
            </p>
            <p className="mt-0.5 text-[9px] text-kal-muted">tasks</p>
          </div>
        ))}
      </div>

      {/* Daily Plan list */}
      <div>
        <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-kal-muted">
          Today's plan
        </p>
        <div className="space-y-1.5">
          {[
            { subject: "Physics", topic: "Thermodynamics", done: true },
            { subject: "Chemistry", topic: "Electrochemistry", done: true },
            { subject: "Maths", topic: "Probability", done: false },
            { subject: "Revision", topic: "Optics (7 days ago)", done: false, rev: true },
          ].map(({ subject, topic, done, rev }) => (
            <div key={topic} className="flex items-center gap-2 rounded-lg border border-kal-border bg-kal-card-muted px-2.5 py-2 backdrop-blur-sm">
              <div
                className={`flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] ${
                  done
                    ? "bg-emerald-500 text-white"
                    : rev
                      ? "border border-amber-400 bg-amber-50 dark:border-amber-500/50 dark:bg-amber-950/45"
                      : "border border-kal-border"
                }`}
                aria-hidden
              >
                {done && "✓"}
              </div>
              <span className={`min-w-0 flex-1 text-[11px] font-medium ${done ? "line-through text-kal-muted" : "text-kal-text"}`}>
                {topic}
              </span>
              <span className={`shrink-0 text-[9px] font-semibold ${rev ? "text-amber-600 dark:text-amber-400" : "text-kal-muted"}`}>
                {rev ? "REV" : subject}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
