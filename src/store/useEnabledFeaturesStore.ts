"use client";

import { create } from "zustand";

import { getSupabaseBrowserClient } from "@/lib/supabase";

/** Align with nav filtering: null = show every feature (no customisation). */
export function normalizeEnabledFeaturesRow(raw: unknown): string[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const ids = raw.filter(
    (id): id is string => typeof id === "string" && id.trim().length > 0,
  );
  return ids.length > 0 ? ids : null;
}

/**
 * `null` = use app default quick bar (all eligible items in default order).
 * `[]` = user chose no shortcuts in the top bar.
 * Non-empty = explicit hrefs in that order.
 */
export function normalizeQuickNavHrefsRow(raw: unknown): string[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  if (raw.length === 0) return [];
  const hrefs = raw.filter(
    (h): h is string => typeof h === "string" && h.trim().length > 0,
  );
  return hrefs;
}

type EnabledFeaturesState = {
  /** null = not yet loaded OR user has no customisation (show all). */
  enabledFeatures: string[] | null;
  /**
   * null = default quick bar; [] = no icons; else ordered hrefs for the top strip only.
   */
  quickNavHrefs: string[] | null;
  /** True after `SubscriptionAccessProvider` / `useSubscriptionAccess` (or `fetch`) applied a profile row for the signed-in user. */
  hydratedFromProfile: boolean;
  loading: boolean;
  /** Replace the in-memory selection (call after saving to DB). */
  setEnabledFeatures: (ids: string[] | null) => void;
  setQuickNavHrefs: (hrefs: string[] | null) => void;
  /** Mark store as not yet loaded from profile (e.g. logout). */
  resetEnabledFeaturesHydration: () => void;
  /** Fetch enabled_features for the given user_id from user_profiles. */
  fetch: (userId: string) => Promise<void>;
};

export const useEnabledFeaturesStore = create<EnabledFeaturesState>((set) => ({
  enabledFeatures: null,
  quickNavHrefs: null,
  hydratedFromProfile: false,
  loading: false,

  setEnabledFeatures: (ids) =>
    set({ enabledFeatures: ids, hydratedFromProfile: true }),

  setQuickNavHrefs: (hrefs) =>
    set({ quickNavHrefs: hrefs, hydratedFromProfile: true }),

  resetEnabledFeaturesHydration: () =>
    set({
      enabledFeatures: null,
      quickNavHrefs: null,
      hydratedFromProfile: false,
    }),

  fetch: async (userId: string) => {
    set({ loading: true });
    try {
      const supabase = getSupabaseBrowserClient();
      let { data, error } = await supabase
        .from("user_profiles")
        .select("enabled_features, quick_nav_hrefs")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        const msg = [error.message, error.details, error.hint].filter(Boolean).join(" ");
        if (/quick_nav_hrefs/i.test(msg) && /does not exist|Unknown column|not found|schema cache/i.test(msg)) {
          const retry = await supabase
            .from("user_profiles")
            .select("enabled_features")
            .eq("user_id", userId)
            .maybeSingle();
          data = retry.data
            ? { ...retry.data, quick_nav_hrefs: null }
            : null;
          error = retry.error;
        }
      }

      if (error) {
        console.warn("[useEnabledFeaturesStore] fetch error", error);
        return;
      }

      const rawQuick =
        data && typeof data === "object" && "quick_nav_hrefs" in data
          ? (data as { quick_nav_hrefs?: unknown }).quick_nav_hrefs
          : null;
      set({
        enabledFeatures: normalizeEnabledFeaturesRow(data?.enabled_features),
        quickNavHrefs: normalizeQuickNavHrefsRow(rawQuick),
        hydratedFromProfile: true,
      });
    } finally {
      set({ loading: false });
    }
  },
}));
