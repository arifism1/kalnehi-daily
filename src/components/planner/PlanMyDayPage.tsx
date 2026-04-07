"use client";

import { ArrowLeft, Camera, Mic, PenLine } from "lucide-react";
import Link from "next/link";

/**
 * Full-screen style hub: one place to choose handwritten scan, self type, or dictate.
 * All paths feed the same Today's Targets list on the home dashboard.
 */
export function PlanMyDayPage() {
  return (
    <div className="relative mx-auto max-w-3xl pb-16 pt-2 sm:pt-4">
      <div
        className="pointer-events-none absolute -right-24 -top-10 h-56 w-56 rounded-full bg-kal-accent/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-20 h-48 w-48 rounded-full bg-kal-accent/5 blur-3xl"
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
          Choose how you capture your schedule — handwritten scan, quick typing, or
          voice. Everything lands in{" "}
          <span className="font-medium text-kal-text-secondary">
            Today&apos;s targets
          </span>{" "}
          on your home screen.
        </p>
      </header>

      <div className="relative flex flex-col gap-5 sm:gap-6">
        <Link
          href="/paste-handwritten"
          className="group flex min-h-[148px] flex-col items-center justify-center rounded-[1.35rem] border-2 border-kal-border bg-kal-card px-5 py-8 text-center kal-shadow-card transition-all duration-200 hover:border-kal-accent/45 hover:bg-kal-accent-soft/50 hover:shadow-md active:scale-[0.99]"
        >
          <span className="text-3xl leading-none" aria-hidden>
            📸
          </span>
          <span className="mt-3 flex items-center gap-2 text-base font-bold text-kal-text">
            <Camera
              className="h-5 w-5 text-kal-accent opacity-85 group-hover:opacity-100"
              aria-hidden
            />
            Handwritten
          </span>
          <span className="mt-2 max-w-[14rem] text-[11px] font-medium uppercase tracking-wide text-kal-muted">
            Scan your list — in-app camera &amp; OCR
          </span>
        </Link>

        <Link
          href="/?quickAdd=1"
          className="group flex min-h-[148px] flex-col items-center justify-center rounded-[1.35rem] border-2 border-kal-border bg-kal-card px-5 py-8 text-center kal-shadow-card transition-all duration-200 hover:border-kal-accent/45 hover:bg-kal-accent-soft/50 hover:shadow-md active:scale-[0.99]"
        >
          <span className="text-3xl leading-none" aria-hidden>
            ✍️
          </span>
          <span className="mt-3 flex items-center gap-2 text-base font-bold text-kal-text">
            <PenLine
              className="h-5 w-5 text-kal-accent opacity-85 group-hover:opacity-100"
              aria-hidden
            />
            Self type
          </span>
          <span className="mt-2 max-w-[14rem] text-[11px] font-medium uppercase tracking-wide text-kal-muted">
            Quick add a target by hand
          </span>
        </Link>

        <Link
          href="/dictate-day"
          className="group flex min-h-[148px] flex-col items-center justify-center rounded-[1.35rem] border-2 border-kal-border bg-kal-card px-5 py-8 text-center kal-shadow-card transition-all duration-200 hover:border-kal-accent/45 hover:bg-kal-accent-soft/50 hover:shadow-md active:scale-[0.99]"
        >
          <span className="text-3xl leading-none" aria-hidden>
            🎤
          </span>
          <span className="mt-3 flex items-center gap-2 text-base font-bold text-kal-text">
            <Mic
              className="h-5 w-5 text-kal-accent opacity-85 group-hover:opacity-100"
              aria-hidden
            />
            Dictate My Day
          </span>
          <span className="mt-2 max-w-[14rem] text-[11px] font-medium uppercase tracking-wide text-kal-muted">
            Speak — smart timed tasks
          </span>
        </Link>
      </div>

      <p className="relative mt-10 text-center text-sm leading-relaxed text-kal-muted sm:mt-12">
        Tip: after you add tasks, scroll to{" "}
        <span className="font-medium text-kal-text-secondary">The arena</span> on the
        home page to execute and tick them off.
      </p>
    </div>
  );
}
