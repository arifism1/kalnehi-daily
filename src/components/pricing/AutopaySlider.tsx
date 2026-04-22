"use client";

import { useState } from "react";
import { CalendarClock } from "lucide-react";

import {
  AUTOPAY_MONTHS_MAX,
  AUTOPAY_MONTHS_MIN,
  DEFAULT_AUTOPAY_MONTHS,
  clampAutopayMonths,
} from "@/lib/autopayMonths";

const PRESET_MONTHS = [1, 2, 3, 6, 12] as const;

export function AutopaySlider() {
  const [months, setMonths] = useState(DEFAULT_AUTOPAY_MONTHS);
  const monthWord = months === 1 ? "month" : "months";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="kal-glass-panel relative overflow-hidden rounded-2xl border border-kal-accent/25">
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-kal-accent/10 blur-3xl"
          aria-hidden
        />
        <div className="relative p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-kal-accent/15 text-kal-accent ring-1 ring-kal-accent/20">
              <CalendarClock className="h-5 w-5" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-kal-accent">
                Smart Plan · ₹499/month
              </p>
              <h3 className="mt-1 text-lg font-semibold text-kal-text" style={{ fontFamily: "var(--font-display)" }}>
                How long should autopay run?
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-kal-text-secondary">
                Choose how many monthly charges your UPI or card mandate may take. It stops
                automatically after your chosen period. Cancel earlier anytime from settings.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {/* Quick picks */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-kal-text-secondary">
                Quick picks
              </p>
              <div
                className="kal-glass-subtle grid grid-cols-5 gap-1.5 rounded-xl border border-white/50 p-1.5 dark:border-white/10"
                role="group"
                aria-label="Preset autopay durations"
              >
                {PRESET_MONTHS.map((m) => {
                  const selected = months === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setMonths(m)}
                      className={`flex min-h-[52px] flex-col items-center justify-center rounded-lg px-1 py-2 text-center transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kal-accent ${
                        selected
                          ? "bg-kal-accent text-white shadow-sm"
                          : "text-kal-text-secondary hover:bg-kal-card-muted hover:text-kal-text"
                      }`}
                    >
                      <span className="text-xl font-bold tabular-nums leading-none">{m}</span>
                      <span className="mt-0.5 text-[0.6rem] font-semibold leading-none opacity-90">
                        {m === 1 ? "month" : "mo"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slider */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <label
                  htmlFor="pricing-autopay-range"
                  className="text-xs font-semibold text-kal-text-secondary"
                >
                  Or drag ({AUTOPAY_MONTHS_MIN}–{AUTOPAY_MONTHS_MAX} months)
                </label>
                <span
                  className="flex items-baseline gap-1 tabular-nums"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <span className="text-3xl font-bold leading-none text-kal-accent">{months}</span>
                  <span className="text-xs font-medium text-kal-text-secondary">{monthWord}</span>
                </span>
              </div>
              <input
                id="pricing-autopay-range"
                type="range"
                min={AUTOPAY_MONTHS_MIN}
                max={AUTOPAY_MONTHS_MAX}
                step={1}
                value={months}
                onChange={(e) => setMonths(clampAutopayMonths(e.target.value))}
                className="h-3 w-full cursor-pointer appearance-none rounded-full bg-kal-card-muted accent-kal-accent"
              />
              <div className="mt-1.5 flex justify-between text-[0.6rem] font-medium tabular-nums text-kal-text-secondary/80">
                <span>{AUTOPAY_MONTHS_MIN}</span>
                <span aria-hidden>·</span>
                <span>{AUTOPAY_MONTHS_MAX}</span>
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] px-4 py-3.5 dark:border-emerald-500/20 dark:bg-emerald-500/[0.08]">
              <p className="text-sm leading-snug text-kal-text">
                <span className="font-semibold">Your choice:</span> Up to{" "}
                <span className="font-bold tabular-nums text-kal-accent">{months}</span>{" "}
                monthly payment{months === 1 ? "" : "s"} of ₹499 each.
                Autopay stops automatically after that. Cancel earlier anytime.
              </p>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-kal-muted">
        Charges ₹499 every month for your chosen period, then stops on its own.
        Cancel earlier anytime from settings.
      </p>
    </div>
  );
}
