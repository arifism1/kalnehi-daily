"use client";

import {
  ChevronDown,
  Clapperboard,
  Loader2,
  Moon,
  NotebookPen,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { DailyReflectionClient } from "@/components/reflection/DailyReflectionClient";
import { EndOfDayRecapPanel } from "@/components/recap/EndOfDayRecapPanel";
import { RecapPeriodNav } from "@/components/recap/RecapPeriodNav";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { KalModalShell } from "@/components/ui/KalModalShell";
import { useRecapForDay } from "@/hooks/useRecapForDay";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { isFeatureBlocked } from "@/lib/subscriptionTiers";

type EndOfDaySheetProps = {
  open: boolean;
  onClose: () => void;
  isoDate: string;
  /** Notify parent when open state changes (hide duplicate plan UI). */
  onOpenChange?: (open: boolean) => void;
};

export function EndOfDaySheet({
  open,
  onClose,
  isoDate,
  onOpenChange,
}: EndOfDaySheetProps) {
  if (!open) return null;
  return (
    <EndOfDaySheetContent
      isoDate={isoDate}
      onClose={onClose}
      onOpenChange={onOpenChange}
    />
  );
}

function EndOfDaySheetContent({
  isoDate,
  onClose,
  onOpenChange,
}: {
  isoDate: string;
  onClose: () => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const recap = useRecapForDay(isoDate);
  const [debriefLoading, setDebriefLoading] = useState(true);
  const [embeddedChrome, setEmbeddedChrome] = useState<{
    headerTrailing: ReactNode | null;
    footer: ReactNode | null;
  }>({ headerTrailing: null, footer: null });

  useEffect(() => {
    onOpenChange?.(true);
    return () => onOpenChange?.(false);
  }, [onOpenChange]);

  const {
    loading: subLoading,
    tier,
    hasPaidAccess,
    freeTrialActive,
  } = useSubscriptionAccess();
  const welcomeEligible = hasPaidAccess || freeTrialActive;
  const trialUnlocksNav = hasPaidAccess || freeTrialActive;
  const debriefFeatureBlocked =
    !subLoading && !trialUnlocksNav && isFeatureBlocked(tier, "daily_log");

  const sheetLoading =
    recap.loading || (!debriefFeatureBlocked && debriefLoading);

  const onDebriefLoadingChange = useCallback((loading: boolean) => {
    setDebriefLoading(loading);
  }, []);

  const onEmbeddedChrome = useCallback(
    (chrome: { headerTrailing: ReactNode | null; footer: ReactNode | null }) => {
      setEmbeddedChrome(chrome);
    },
    [],
  );

  const sheetFooter = sheetLoading ? undefined : (
    <div className="flex flex-col gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
      {embeddedChrome.footer}
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <FootLink
          href="/recap"
          icon={<Clapperboard className="size-4" />}
          label="Full recap page"
        />
        <FootLink
          href="/daily-debrief"
          icon={<NotebookPen className="size-4" />}
          label="Daily debrief"
        />
      </div>
      {!subLoading && welcomeEligible ? (
        <button
          type="button"
          disabled={sheetLoading}
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-kal-border bg-kal-page px-4 text-sm font-semibold text-kal-text transition-colors hover:border-kal-accent/50 hover:bg-kal-accent-soft/60 disabled:opacity-50"
          onClick={() => {
            onClose();
            router.push("/welcome/night");
          }}
        >
          <Moon className="size-4 text-kal-accent" aria-hidden />
          I&apos;m done for the day
        </button>
      ) : null}
    </div>
  );

  return (
    <KalModalShell
      title="Wrap up today"
      subtitle="Recap · debrief · rest"
      onClose={onClose}
      busy={sheetLoading}
      footer={sheetFooter}
      scrollClassName="scroll-pb-8 [scroll-padding-bottom:max(8rem,env(safe-area-inset-bottom))]"
    >
      {sheetLoading ? (
        <div
          className="flex min-h-[280px] items-center justify-center"
          aria-live="polite"
          aria-label="Loading wrap-up"
        >
          <Loader2 className="size-8 animate-spin text-kal-accent" />
        </div>
      ) : null}

      <div className={sheetLoading ? "sr-only" : "space-y-8"} aria-hidden={sheetLoading}>
        <details className="group rounded-2xl border border-kal-border bg-kal-card-muted/40">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-kal-accent [&::-webkit-details-marker]:hidden">
            <span>Today&apos;s recap card</span>
            <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <div className="space-y-3 border-t border-kal-border px-4 pb-4 pt-3">
            <RecapPeriodNav active="daily" className="w-full" />
            <EndOfDayRecapPanel isoDate={isoDate} />
          </div>
        </details>

        <section>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-kal-accent">
                Daily debrief
              </h3>
              <p className="mt-1 text-sm text-kal-text-secondary">
                60-second check-in — what landed, what slipped, tomorrow&apos;s one thing.
              </p>
            </div>
            {embeddedChrome.headerTrailing}
          </div>
          <div className="mt-4">
            <FeatureGate feature="daily_log">
              <DailyReflectionClient
                collapsible={false}
                embedded
                embeddedFooterActions
                showInlineRecentHistory={false}
                onLoadingChange={onDebriefLoadingChange}
                onEmbeddedChrome={onEmbeddedChrome}
              />
            </FeatureGate>
          </div>
        </section>
      </div>
    </KalModalShell>
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
