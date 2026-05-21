"use client";

import { create } from "zustand";

import { getSupabaseBrowserClient } from "@/lib/supabase";

/**
 * Raw `user_profiles.enabled_features`:
 * - `null` / missing = never customised → UI resolves via {@link DEFAULT_ENABLED_FEATURE_IDS} (see dashboardFeatures).
 * - `[]` = explicitly disabled everything that participates in filtering (persisted empty `text[]`).
 * - non-empty array = explicit enabled ids only.
 */
export function normalizeEnabledFeaturesRow(raw: unknown): string[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  if (raw.length === 0) return [];
  // react-doctor-disable-next-line react-doctor/js-combine-iterations -- filter-then-map with type narrowing; flatMap would lose the type predicate
  const ids = raw
    .filter(
      (id): id is string => typeof id === "string" && id.trim().length > 0,
    )
    .map((id) => {
      if (id === "syllabus-mastery-tracker") return "syllabus-tracker";
      if (id === "revision-reminders") return "revision-tracker";
      if (id === "backlog-tracker" || id === "backlog-list") return "backlogs";
      return id;
    });
  const deduped = [...new Set(ids)];
  return deduped.length > 0 ? deduped : [];
}

type EnabledFeaturesState = {
  /**
   * Raw DB column value (before resolving defaults). Before profile fetch this stays `null`;
   * callers that need stable filtering should wait for `hydratedFromProfile` or resolve explicitly.
   */
  enabledFeatures: string[] | null;
  /** True after `SubscriptionAccessProvider` / `useSubscriptionAccess` (or `fetch`) applied a profile row for the signed-in user. */
  hydratedFromProfile: boolean;
  loading: boolean;
  /** Replace the in-memory selection (call after saving to DB). */
  setEnabledFeatures: (ids: string[] | null) => void;
  /** Mark store as not yet loaded from profile (e.g. logout). */
  resetEnabledFeaturesHydration: () => void;
  /** Fetch enabled_features for the given user_id from user_profiles. */
  fetch: (userId: string) => Promise<void>;
};

export const useEnabledFeaturesStore = create<EnabledFeaturesState>((set) => ({
  enabledFeatures: null,
  hydratedFromProfile: false,
  loading: false,

  setEnabledFeatures: (ids) =>
    set({ enabledFeatures: ids, hydratedFromProfile: true }),

  resetEnabledFeaturesHydration: () =>
    set({
      enabledFeatures: null,
      hydratedFromProfile: false,
    }),

  fetch: async (userId: string) => {
    set({ loading: true });
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("user_profiles")
        .select("enabled_features")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.warn("[useEnabledFeaturesStore] fetch error", error);
        return;
      }

      set({
        enabledFeatures: normalizeEnabledFeaturesRow(data?.enabled_features),
        hydratedFromProfile: true,
      });
    } finally {
      set({ loading: false });
    }
  },
}));
