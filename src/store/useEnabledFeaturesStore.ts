"use client";

import { create } from "zustand";

import { getSupabaseBrowserClient } from "@/lib/supabase";

type EnabledFeaturesState = {
  /** null = not yet loaded OR user has no customisation (show all). */
  enabledFeatures: string[] | null;
  loading: boolean;
  /** Replace the in-memory selection (call after saving to DB). */
  setEnabledFeatures: (ids: string[] | null) => void;
  /** Fetch enabled_features for the given user_id from user_profiles. */
  fetch: (userId: string) => Promise<void>;
};

export const useEnabledFeaturesStore = create<EnabledFeaturesState>((set) => ({
  enabledFeatures: null,
  loading: false,

  setEnabledFeatures: (ids) => set({ enabledFeatures: ids }),

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

      const raw = data?.enabled_features;
      // Keep null if empty array (treat same as "all enabled")
      set({
        enabledFeatures: Array.isArray(raw) && raw.length > 0 ? raw : null,
      });
    } finally {
      set({ loading: false });
    }
  },
}));
