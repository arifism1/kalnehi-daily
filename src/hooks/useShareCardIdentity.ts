"use client";

import { useAllExamScopes } from "@/hooks/useAllExamScopes";
import { useProfileDisplayName } from "@/hooks/useProfileDisplayName";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Name + exam line for shareable recap PNGs (profile DB first, then auth fallbacks).
 */
export function useShareCardIdentity(): {
  userDisplayName: string;
  examLine: string;
  loading: boolean;
} {
  const authInitialized = useAuthStore((s) => s.initialized);
  const { displayName: userDisplayName, loading: profileLoading } =
    useProfileDisplayName();
  const { examScopes } = useAllExamScopes();

  const examLine = examScopes
    .map((s) => (s.displayName || s.examLabel).trim())
    .filter(Boolean)
    .join(" · ");

  /** True until auth resolved and (if signed in) profile name fetch finished. */
  const loading = !authInitialized || profileLoading;

  return { userDisplayName, examLine, loading };
}
