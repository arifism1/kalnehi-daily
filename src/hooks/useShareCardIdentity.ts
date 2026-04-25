"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useTargetExamDisplay } from "@/hooks/useTargetExamDisplay";
import { KALNEHI_PROFILE_UPDATED_EVENT } from "@/lib/profileEvents";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

function displayNameFromUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
} | null): string {
  if (!user) return "Aspirant";
  const meta = user.user_metadata;
  const fromMeta =
    (typeof meta?.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta?.name === "string" && meta.name.trim()) ||
    null;
  if (fromMeta) return fromMeta;
  if (typeof user.email === "string" && user.email.includes("@")) {
    return user.email.split("@")[0] ?? "Aspirant";
  }
  return "Aspirant";
}

/**
 * Name + exam line for shareable recap PNGs (profile DB first, then auth fallbacks).
 */
export function useShareCardIdentity(): {
  userDisplayName: string;
  examLine: string;
  loading: boolean;
} {
  const user = useAuthStore((s) => s.user);
  const authInitialized = useAuthStore((s) => s.initialized);
  const { examLabel, examDisplayName } = useTargetExamDisplay();

  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileFetched, setProfileFetched] = useState(false);

  const refreshProfileName = useCallback(async () => {
    const uid = user?.id;
    if (!uid) {
      setProfileName(null);
      setProfileFetched(true);
      return;
    }
    setProfileFetched(false);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("user_profiles")
        .select("full_name")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw error;
      const n = data?.full_name?.trim();
      setProfileName(n || null);
    } catch {
      setProfileName(null);
    } finally {
      setProfileFetched(true);
    }
  }, [user?.id]);

  useEffect(() => {
    void refreshProfileName();
  }, [refreshProfileName]);

  useEffect(() => {
    const onProfile = () => void refreshProfileName();
    window.addEventListener(KALNEHI_PROFILE_UPDATED_EVENT, onProfile);
    return () =>
      window.removeEventListener(KALNEHI_PROFILE_UPDATED_EVENT, onProfile);
  }, [refreshProfileName]);

  const userDisplayName = useMemo(() => {
    if (profileName) return profileName;
    return displayNameFromUser(user);
  }, [profileName, user]);

  const examLine = (examDisplayName || examLabel || "").trim();

  /** True until auth resolved and (if signed in) profile name fetch finished. */
  const loading = !authInitialized || !profileFetched;

  return { userDisplayName, examLine, loading };
}
