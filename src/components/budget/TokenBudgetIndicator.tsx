"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import clsx from "clsx";

import { usePlatform } from "@/hooks/usePlatform";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { WELCOME_AI_TOKEN_CAP, MONTHLY_AI_TOKEN_CAP } from "@/lib/prepbrainTokens";

/**
 * Displays AI token budget status in a compact pill.
 * Color coding: >50% muted, 25-50% amber, <25% orange, 0% urgent.
 */
type UsagePayload = { used: number; limit: number } | null;

function usePrepbrainTokenUsage(): UsagePayload {
  const [payload, setPayload] = useState<UsagePayload>(null);
  const { refetchVersion } = useSubscriptionAccess();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/prepbrain/usage")
      .then((r) => r.json())
      .then((data: { ok: boolean; usage?: { used: number; limit: number } }) => {
        if (!cancelled && data.ok && data.usage) {
          setPayload({ used: data.usage.used, limit: data.usage.limit });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [refetchVersion]);

  return payload;
}

export function TokenBudgetIndicator() {
  const { freeTrialActive, hasPaidAccess, loading } = useSubscriptionAccess();
  const { isApp } = usePlatform();
  const usage = usePrepbrainTokenUsage();

  if (loading || (!freeTrialActive && !hasPaidAccess)) return null;

  const cap = hasPaidAccess ? MONTHLY_AI_TOKEN_CAP : WELCOME_AI_TOKEN_CAP;
  const used = usage?.used ?? 0;
  const remaining = Math.max(0, cap - used);
  const pct = cap > 0 ? remaining / cap : 0;

  const exhausted = remaining === 0;

  const colorClass = exhausted
    ? "text-red-500"
    : pct < 0.25
    ? "text-orange-500"
    : pct < 0.5
    ? "text-amber-500"
    : "text-kal-muted";

  function fmt(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${Math.floor(n / 1000)}K`;
    return String(n);
  }

  if (exhausted) {
    if (isApp) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-500">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />
          Mastermind limit reached
        </span>
      );
    }
    return (
      <Link
        href="/pricing#subscribe"
        className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-500"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />
        Upgrade to continue
      </Link>
    );
  }

  const resetNote = hasPaidAccess ? "· resets 1st" : null;

  return (
    <span className={clsx("inline-flex items-center gap-1 text-xs font-medium tabular-nums", colorClass)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />
      AI: {fmt(remaining)} left
      {pct < 0.25 && !exhausted && (
        <span className="ml-0.5 font-semibold text-orange-500">· Low</span>
      )}
      {resetNote && <span className="opacity-60">{resetNote}</span>}
    </span>
  );
}
