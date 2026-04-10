"use client";

import { ArrowLeft, CalendarDays, Camera, Lock, Mic, PenLine } from "lucide-react";
import Link from "next/link";

import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { isFeatureBlocked } from "@/lib/subscriptionTiers";

function PlannerCard({
  href,
  emoji,
  icon,
  title,
  subtitle,
  locked,
  order,
}: {
  href: string;
  emoji: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  locked: boolean;
  order: string;
}) {
  if (locked) {
    return (
      <div
        className={`${order} group relative flex min-h-[148px] flex-col items-center justify-center rounded-[1.35rem] border-2 border-kal-border bg-kal-card-muted px-5 py-8 text-center opacity-65 kal-shadow-card`}
      >
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-kal-card-muted px-2.5 py-1 text-[10px] font-semibold text-kal-text-secondary">
          <Lock className="h-3 w-3" />
          Pro
        </span>
        <span className="text-3xl leading-none grayscale" aria-hidden>
          {emoji}
        </span>
        <span className="mt-3 flex items-center gap-2 text-base font-bold text-kal-text-secondary">
          {icon}
          {title}
        </span>
        <span className="mt-2 max-w-[14rem] text-[11px] font-medium uppercase tracking-wide text-kal-muted">
          {subtitle}
        </span>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`${order} group flex min-h-[148px] flex-col items-center justify-center rounded-[1.35rem] border-2 border-kal-border bg-kal-card px-5 py-8 text-center kal-shadow-card transition-[border-color,background-color,box-shadow,transform] duration-200 will-change-transform hover:border-kal-accent/45 hover:bg-kal-accent-soft/50 hover:shadow-md active:scale-[0.99]`}
    >
      <span className="text-3xl leading-none" aria-hidden>
        {emoji}
      </span>
      <span className="mt-3 flex items-center gap-2 text-base font-bold text-kal-text">
        {icon}
        {title}
      </span>
      <span className="mt-2 max-w-[14rem] text-[11px] font-medium uppercase tracking-wide text-kal-muted">
        {subtitle}
      </span>
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

      <header className="relative mb-10 text-center sm:mb-12 sm:text-left">
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

      <div className="relative flex flex-col gap-5 sm:gap-6">
        <PlannerCard
          href="/daily-plan"
          emoji="📋"
          icon={
            <CalendarDays
              className="h-5 w-5 text-kal-accent opacity-85 group-hover:opacity-100"
              aria-hidden
            />
          }
          title="Daily planner"
          subtitle="Unified list — typed, voice & handwritten"
          locked={false}
          order="order-1"
        />
        <PlannerCard
          href="/dictate-day"
          emoji="🎤"
          icon={
            <Mic
              className="h-5 w-5 text-kal-accent opacity-85 group-hover:opacity-100"
              aria-hidden
            />
          }
          title="Dictate My Day"
          subtitle="Speak — smart timed tasks"
          locked={dictateLocked}
          order="order-2"
        />

        <PlannerCard
          href="/paste-handwritten"
          emoji="📸"
          icon={
            <Camera
              className="h-5 w-5 text-kal-accent opacity-85 group-hover:opacity-100"
              aria-hidden
            />
          }
          title="Handwritten"
          subtitle="Snap your list — camera & OCR"
          locked={handwrittenLocked}
          order="order-3"
        />

        <PlannerCard
          href="/self-type-day"
          emoji="✍️"
          icon={
            <PenLine
              className="h-5 w-5 text-kal-accent opacity-85 group-hover:opacity-100"
              aria-hidden
            />
          }
          title="Self type"
          subtitle="Type & edit your day's plan"
          locked={false}
          order="order-4"
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
