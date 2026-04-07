"use client";

import { Camera, Mic, PenLine } from "lucide-react";
import Link from "next/link";

type Props = {
  userId: string | undefined;
  onManualAdd: () => void;
};

/**
 * Unified entry points for filling today’s targets: voice, handwritten scan, manual add.
 */
export function PlanMyDayHub({ userId, onManualAdd }: Props) {
  const disabled = !userId;

  return (
    <div
      id="plan-my-day"
      className="scroll-mt-28 rounded-2xl border border-kal-border bg-gradient-to-br from-kal-accent-soft/80 via-kal-card to-kal-card px-4 py-5 kal-shadow-card sm:px-6 sm:py-6"
    >
      <div className="mb-4 text-center sm:mb-5 sm:text-left">
        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-kal-accent sm:text-[0.65rem]">
          Planning
        </p>
        <h2 className="mt-1 text-lg font-bold text-kal-text sm:text-xl">
          Plan My Day
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-kal-muted sm:text-sm">
          Pick how you enter tasks — everything lands in today&apos;s targets below.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Link
          href="/dictate-day"
          className="group flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-kal-border bg-kal-card px-4 py-4 text-center transition-all duration-200 hover:border-kal-accent/50 hover:bg-kal-accent-soft active:scale-[0.99] sm:min-h-[104px]"
        >
          <span className="text-2xl" aria-hidden>
            🎤
          </span>
          <span className="flex items-center gap-2 text-sm font-bold text-kal-text">
            <Mic
              className="h-4 w-4 text-kal-accent opacity-80 group-hover:opacity-100"
              aria-hidden
            />
            Dictate My Day
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-kal-muted">
            Voice → smart list
          </span>
        </Link>

        <Link
          href="/paste-handwritten"
          className="group flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-kal-border bg-kal-card px-4 py-4 text-center transition-all duration-200 hover:border-kal-accent/50 hover:bg-kal-accent-soft active:scale-[0.99] sm:min-h-[104px]"
        >
          <span className="text-2xl" aria-hidden>
            📸
          </span>
          <span className="flex items-center gap-2 text-sm font-bold text-kal-text">
            <Camera
              className="h-4 w-4 text-kal-accent opacity-80 group-hover:opacity-100"
              aria-hidden
            />
            Scan handwritten list
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-kal-muted">
            Camera · in-app OCR
          </span>
        </Link>

        <button
          type="button"
          disabled={disabled}
          onClick={onManualAdd}
          className="group flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-kal-border bg-kal-card px-4 py-4 text-center transition-all duration-200 hover:border-kal-accent/50 hover:bg-kal-accent-soft active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-[104px]"
        >
          <span className="text-2xl" aria-hidden>
            ✍️
          </span>
          <span className="flex items-center gap-2 text-sm font-bold text-kal-text">
            <PenLine
              className="h-4 w-4 text-kal-accent opacity-80 group-hover:opacity-100"
              aria-hidden
            />
            Manual add target
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-kal-muted">
            Quick type-in
          </span>
        </button>
      </div>

      {disabled ? (
        <p className="mt-3 text-center text-[11px] text-kal-muted sm:text-left">
          Sign in to add targets manually here and keep everything in sync.
        </p>
      ) : null}
    </div>
  );
}
