"use client";

import { create } from "zustand";

import { getSupabaseBrowserClient } from "@/lib/supabase";

/**
 * Align with nav / home filtering:
 * - `null` or missing = show every feature (no customisation in DB).
 * - `[]` = user explicitly selected none (persisted empty `text[]`).
 * - non-empty = only those feature ids.
 */
export function normalizeEnabledFeaturesRow(raw: unknown): string[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  if (raw.length === 0) return [];
  const ids = raw.filter(
    (id): id is string => typeof id === "string" && id.trim().length > 0,
  );
  return ids.length > 0 ? ids : [];
}

type EnabledFeaturesState = {
  /**
   * Before first profile fetch: often `null` (treat as show all).
   * After load: `null` = no customisation (show all); `[]` = none enabled; else explicit ids.
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
