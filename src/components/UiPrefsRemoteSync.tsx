"use client";

import { useEffect, useRef, useState } from "react";

import { updateUserUiPrefs } from "@/actions/clientProfileExtras";
import { applyRemoteUiPrefs } from "@/lib/applyRemoteUiPrefs";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import {
  pickUiPrefsForSync,
  useSettingsStore,
} from "@/store/useSettingsStore";
import type { Json } from "@/types/supabase";

/**
 * Loads `user_profiles.ui_prefs` after sign-in, then mirrors settings changes
 * back to the server (debounced).
 */
export function UiPrefsRemoteSync() {
  const userId = useAuthStore((s) => s.user?.id);
  const [remoteReady, setRemoteReady] = useState(false);
  const lastPushedRef = useRef<string | null>(null);
  const skipNextRef = useRef(0);

  useEffect(() => {
    if (!userId) {
      setRemoteReady(false);
      lastPushedRef.current = null;
      return;
    }
    let cancelled = false;
    setRemoteReady(false);
    void (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("user_profiles")
          .select("ui_prefs")
          .eq("user_id", userId)
          .maybeSingle();
        if (cancelled) return;
        if (!error && data?.ui_prefs != null && typeof data.ui_prefs === "object") {
          skipNextRef.current += 1;
          applyRemoteUiPrefs(data.ui_prefs);
          lastPushedRef.current = JSON.stringify(data.ui_prefs);
        }
      } finally {
        if (!cancelled) setRemoteReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !remoteReady) return;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const unsub = useSettingsStore.subscribe((state) => {
      if (skipNextRef.current > 0) {
        skipNextRef.current -= 1;
        return;
      }
      const slice = pickUiPrefsForSync(state);
      const json = JSON.stringify(slice);
      if (json === lastPushedRef.current) return;
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        debounce = null;
        lastPushedRef.current = json;
        void updateUserUiPrefs(slice as unknown as Json).then((r) => {
          if (!r.ok) lastPushedRef.current = null;
        });
      }, 1200);
    });
    return () => {
      if (debounce) clearTimeout(debounce);
      unsub();
    };
  }, [userId, remoteReady]);

  return null;
}
