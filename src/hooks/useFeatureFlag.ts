"use client";

import { useEffect, useState } from "react";

type FlagValue = { enabled: boolean; message: string | null };
type FlagsResponse = { flags: Record<string, FlagValue> };

type CacheEntry = { data: FlagsResponse; fetchedAt: number };

// Module-level cache shared across all hook instances.
// TTL: 5 seconds — short enough to pick up Edge Config propagation quickly
// while still preventing a flood of requests on rapid re-renders.
const CACHE_TTL_MS = 5_000;
let cacheEntry: CacheEntry | null = null;
let pendingFetch: Promise<FlagsResponse> | null = null;

async function loadFlags(): Promise<FlagsResponse> {
  // Return cached data if fresh.
  if (cacheEntry && Date.now() - cacheEntry.fetchedAt < CACHE_TTL_MS) {
    return cacheEntry.data;
  }

  // Deduplicate concurrent fetches.
  if (pendingFetch) return pendingFetch;

  pendingFetch = fetch("/api/feature-flags", { credentials: "include" })
    .then((res) => {
      if (!res.ok) return { flags: {} };
      return res.json() as Promise<FlagsResponse>;
    })
    .then((data) => {
      cacheEntry = { data, fetchedAt: Date.now() };
      pendingFetch = null;
      return data;
    })
    .catch(() => {
      pendingFetch = null;
      return { flags: {} };
    });

  return pendingFetch;
}

/**
 * Returns the enabled state and optional disabled message for a feature flag.
 * Defaults to `enabled: true` while loading — feature components render normally
 * on first paint and only gate if the flag is explicitly disabled.
 *
 * Usage:
 *   const { enabled, message } = useFeatureFlag('prepbrain_ai')
 *   if (!enabled) return <FeatureDisabledCard message={message} />
 */
export function useFeatureFlag(featureKey: string): FlagValue {
  const [value, setValue] = useState<FlagValue>({ enabled: true, message: null });

  useEffect(() => {
    let cancelled = false;
    loadFlags().then((data) => {
      if (cancelled) return;
      const flag = data.flags[featureKey];
      if (flag !== undefined) setValue(flag);
    });
    return () => {
      cancelled = true;
    };
  }, [featureKey]);

  return value;
}
