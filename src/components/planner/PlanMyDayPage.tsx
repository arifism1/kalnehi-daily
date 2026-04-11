"use client";

import { ArrowLeft, CalendarDays, Camera, Lock, Mic, PenLine } from "lucide-react";
import Link from "next/link";

import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { isFeatureBlocked } from "@/lib/subscriptionTiers";

const plannerCardShell =
  "group relative flex min-h-0 flex-row items-center gap-3 rounded-xl border-2 border-kal-border px-3 py-2.5 text-left kal-shadow-card sm:gap-3.5 sm:rounded-[1rem] sm:py-3 sm:pl-3.5 sm:pr-4";

function PlannerCard({
  href,
  emoji,
  icon,
  title,
  subtitle,
  locked,
}: {
  href: string;
  emoji: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  locked: boolean;
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

  if (locked) {
    return (
      <div
        className={`${plannerCardShell} bg-kal-card-muted pr-12 opacity-65 sm:pr-14`}
      >
        <span className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full bg-kal-card px-1.5 py-0.5 text-[9px] font-semibold text-kal-text-secondary ring-1 ring-kal-border/60">
          <Lock className="h-2.5 w-2.5" />
          Pro
        </span>
        {body}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`${plannerCardShell} bg-kal-card transition-[border-color,background-color,box-shadow,transform] duration-200 will-change-transform hover:border-kal-accent/45 hover:bg-kal-accent-soft/50 hover:shadow-md active:scale-[0.99]`}
    >
      {body}
    </Link>
  );
}

export function PlanMyDayPage() {
  const { tier } = useSubscriptionAccess();
  const dictateLocked = isFeatureBlocked(tier, "dictate_day");
  const handwrittenLocked = isFeatureBlocked(tier, "handwritten_scanner");

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
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-kal-text sm:text-4xl">
          Plan My Day
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-kal-muted sm:mx-0 sm:text-base">
          {dictateLocked
            ? "Type your plan below. Upgrade to Pro to unlock voice dictation and handwritten scanning."
            : "One shared plan per day — use voice, scan, or typing. Open the daily planner anytime to see everything together."}
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
          subtitle="Unified list — typed, voice & handwritten"
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
          href="/paste-handwritten"
          emoji="📸"
          icon={
            <Camera
              className="h-3.5 w-3.5 shrink-0 text-kal-accent opacity-85 group-hover:opacity-100 sm:h-4 sm:w-4"
              aria-hidden
            />
          }
          title="Handwritten"
          subtitle="Snap your list — camera & OCR"
          locked={handwrittenLocked}
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
        />
      </div>

      {dictateLocked && (
        <div className="relative mt-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Voice dictation and handwritten scanning require{" "}
            <Link href="/pricing" className="font-semibold underline">
              Pro or Pro Max
            </Link>
            .
          </p>
        </div>
      )}

      <p className="relative mt-10 text-center text-sm leading-relaxed text-kal-muted sm:mt-12">
        All inputs update the same plan for the date you pick. Use{" "}
        <span className="font-medium text-kal-text-secondary">Home</span> for
        syllabus-linked targets and timer; daily planner is for your schedule lines.
      </p>
    </div>
  );
}
