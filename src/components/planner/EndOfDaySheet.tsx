"use client";

import {
  Clapperboard,
  Moon,
  NotebookPen,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { DailyReflectionClient } from "@/components/reflection/DailyReflectionClient";
import { EndOfDayRecapPanel } from "@/components/recap/EndOfDayRecapPanel";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";

type EndOfDaySheetProps = {
  open: boolean;
  onClose: () => void;
  isoDate: string;
};

export function EndOfDaySheet({ open, onClose, isoDate }: EndOfDaySheetProps) {
  const router = useRouter();
  const { loading: subLoading, hasPaidAccess, freeTrialActive } = useSubscriptionAccess();
  const welcomeEligible = hasPaidAccess || freeTrialActive;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[72] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="end-of-day-sheet-title"
        className="kal-glass-panel relative z-[73] flex min-h-0 w-full max-w-lg flex-col rounded-t-[1.75rem] border border-kal-border shadow-2xl sm:max-h-[min(92dvh,52rem)] sm:rounded-[1.75rem]"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-kal-border p-4 sm:px-5">
          <div className="min-w-0">
            <h2
              id="end-of-day-sheet-title"
              className="text-lg font-semibold tracking-tight text-kal-text"
            >
              Wrap up today
            </h2>
            <p className="mt-0.5 truncate text-xs text-kal-muted">
              Recap · debrief · rest
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-kal-border text-kal-text-secondary hover:bg-kal-card-muted hover:text-kal-text"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-6 pt-5 [-webkit-overflow-scrolling:touch] sm:px-5">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-kal-accent">
              Today&apos;s recap
            </h3>
            <EndOfDayRecapPanel isoDate={isoDate} showMagazineLinks={false} />
          </section>

          <section className="mt-8 border-t border-kal-border pt-8">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-kal-accent">
              Daily debrief
            </h3>
            <p className="mt-1 text-sm text-kal-text-secondary">
              60-second check-in — what landed, what slipped, tomorrow&apos;s one thing.
            </p>
            <div className="mt-4">
              <FeatureGate feature="daily_log">
                <DailyReflectionClient
                  collapsible={false}
                  showInlineRecentHistory={false}
                />
              </FeatureGate>
            </div>
          </section>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-kal-border pt-6 text-sm">
            <FootLink href="/recap" icon={<Clapperboard className="size-4" />} label="Full recap page" />
            <FootLink href="/daily-debrief" icon={<NotebookPen className="size-4" />} label="Daily debrief" />
          </div>
        </div>

        {!subLoading && welcomeEligible ? (
          <div className="flex shrink-0 flex-col gap-2 border-t border-kal-border px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <button
              type="button"
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-kal-border bg-kal-page px-4 text-sm font-semibold text-kal-text transition-colors hover:border-kal-accent/50 hover:bg-kal-accent-soft/60 sm:w-auto sm:justify-start sm:min-w-0 sm:flex-initial"
              onClick={() => {
                onClose();
                router.push("/welcome/night");
              }}
            >
              <Moon className="size-4 text-kal-accent" aria-hidden />
              I&apos;m done for the day
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FootLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 font-semibold text-kal-accent underline-offset-4 hover:underline"
    >
      {icon}
      {label}
    </Link>
  );
}
