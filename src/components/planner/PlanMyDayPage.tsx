"use client";

import { ArrowLeft, CalendarDays, Lightbulb, Lock, Mic, PenLine } from "lucide-react";
import Link from "next/link";

import { useAiGate } from "@/hooks/useAiGate";

const plannerCardShell =
  "kal-glass-card group relative flex min-h-0 flex-row items-center gap-3 overflow-hidden rounded-2xl border-2 border-white/35 px-3 py-2.5 text-left sm:gap-3.5 sm:py-3 sm:pl-3.5 sm:pr-4 dark:border-white/15";

function PlannerCard({
  href,
  emoji,
  icon,
  title,
  subtitle,
  locked,
  className,
}: {
  href: string;
  emoji: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  locked: boolean;
  className?: string;
}) {
  const body = (
    <>
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center text-[1.35rem] leading-none sm:h-11 sm:w-11 sm:text-[1.5rem]"
        aria-hidden
      >
        {locked ? <span className="grayscale">{emoji}</span> : emoji}
      </span>
      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex items-center gap-1.5">
          {icon}
          <span
            className={`text-sm font-bold leading-tight sm:text-[0.95rem] ${locked ? "text-kal-text-secondary" : "text-kal-text"}`}
          >
            {title}
          </span>
        </div>
        <p className="mt-0.5 text-[9px] font-medium uppercase leading-snug tracking-wide text-kal-muted sm:text-[10px]">
          {subtitle}
        </p>
      </div>
    </>
  );

  const shell = className
    ? `${plannerCardShell} ${className}`
    : plannerCardShell;

  if (locked) {
    return (
      <div
        className={`${shell} pr-12 opacity-[0.65] saturate-[0.85] sm:pr-14`}
      >
        <span className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full border border-white/30 bg-white/70 px-1.5 py-0.5 text-[9px] font-semibold text-kal-text-secondary shadow-sm backdrop-blur-sm dark:border-white/12 dark:bg-zinc-900/70">
          <Lock className="h-2.5 w-2.5" />
          Unlock
        </span>
        {body}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`${shell} transition-[border-color,background-color,box-shadow,transform] duration-200 will-change-transform hover:border-kal-accent/40 hover:bg-kal-accent-soft/40 hover:shadow-md active:scale-[0.99] dark:hover:bg-zinc-900/80`}
    >
      {body}
    </Link>
  );
}

export function PlanMyDayPage() {
  const { hasAiAccess } = useAiGate();
  const dictateLocked = !hasAiAccess;

  return (
    <div className="relative mx-auto max-w-3xl pb-16 pt-2 [contain:layout_style_paint] sm:pt-4">
      <div
        className="pointer-events-none absolute -right-24 -top-10 h-56 w-56 rounded-full bg-kal-accent/10 blur-3xl will-change-transform"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-20 h-48 w-48 rounded-full bg-kal-accent/5 blur-3xl will-change-transform"
        aria-hidden
      />

      <Link
        href="/"
        className="relative mb-8 inline-flex items-center gap-2 text-sm font-semibold text-kal-accent transition-colors hover:text-kal-accent-hover"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to today
      </Link>

      <header className="relative mb-6 text-center sm:mb-8 sm:text-left">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-kal-accent">
          Planning
        </p>
        <h1 className="kal-feature-title mt-2">Plan My Day</h1>
        <p className="kal-feature-lead mx-auto mt-3 max-w-xl sm:mx-0">
          {dictateLocked
            ? "Type your plan below. Start a trial or subscribe to use voice dictation when you have voice minutes."
            : "One shared plan per day — use voice or typing. Open the daily planner anytime to see everything together."}
        </p>
      </header>

      <div className="relative grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5">
        <PlannerCard
          href="/daily-plan"
          emoji="📋"
          icon={
            <CalendarDays
              className="h-3.5 w-3.5 shrink-0 text-kal-accent opacity-85 group-hover:opacity-100 sm:h-4 sm:w-4"
              aria-hidden
            />
          }
          title="Daily planner"
          subtitle="Unified list — typed and voice"
          locked={false}
        />
        <PlannerCard
          href="/dictate-day"
          emoji="🎤"
          icon={
            <Mic
              className="h-3.5 w-3.5 shrink-0 text-kal-accent opacity-85 group-hover:opacity-100 sm:h-4 sm:w-4"
              aria-hidden
            />
          }
          title="Dictate My Day"
          subtitle="Speak — smart timed tasks"
          locked={dictateLocked}
        />

        <PlannerCard
          href="/self-type-day"
          emoji="✍️"
          icon={
            <PenLine
              className="h-3.5 w-3.5 shrink-0 text-kal-accent opacity-85 group-hover:opacity-100 sm:h-4 sm:w-4"
              aria-hidden
            />
          }
          title="Self type"
          subtitle="Type & edit your day's plan"
          locked={false}
          className="sm:col-span-2"
        />
      </div>

      {dictateLocked && (
        <div className="relative mt-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Voice dictation is included with your{" "}
            <Link href="/pricing" className="font-semibold underline">
              welcome trial or paid plan
            </Link>
            — you get voice minutes with each.
          </p>
        </div>
      )}

      <div className="relative mt-6 flex items-start gap-3 rounded-lg px-[14px] py-3" style={{ backgroundColor: "#FFF3E4" }}>
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#BA7517" }} aria-hidden />
        <p className="text-sm leading-relaxed text-kal-muted">
          All three methods add to the same daily plan — pick whichever suits the moment.
        </p>
      </div>
    </div>
  );
}
