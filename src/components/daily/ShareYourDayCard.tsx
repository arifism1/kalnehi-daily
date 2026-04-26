"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";

export function ShareYourDayCard() {
  const router = useRouter();
  const { loading, hasPaidAccess, freeTrialActive } = useSubscriptionAccess();
  const showShutdownCta = !loading && (hasPaidAccess || freeTrialActive);

  return (
    <div className="kal-glass-subtle rounded-2xl border border-kal-border/70 px-4 py-3 sm:px-5">
      <p className="text-sm font-medium text-kal-text">Share your day</p>
      <p className="mt-0.5 text-xs text-kal-text-secondary">
        Build a story-ready recap card with tasks, study time, and streak.
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Link
          href="/recap"
          className="inline-flex text-sm font-semibold text-kal-accent underline-offset-2 hover:underline"
        >
          Open today&apos;s recap →
        </Link>
        {showShutdownCta ? (
          <button
            type="button"
            onClick={() => router.push("/welcome/night")}
            className="inline-flex w-fit rounded-full border border-kal-border/80 bg-kal-page px-3 py-1.5 text-sm font-semibold text-kal-text transition hover:border-kal-accent/50 hover:bg-kal-accent-soft/60"
          >
            I&apos;m done for the day
          </button>
        ) : null}
      </div>
    </div>
  );
}
