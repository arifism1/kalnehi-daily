"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { resolveSyllabusExam } from "@/lib/examProfile";
import { KALNEHI_PROFILE_UPDATED_EVENT } from "@/lib/profileEvents";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

/** Target exam from profile (`target_exam` → `primary_exam`) — drives syllabus + marks. */
export function usePrimaryExamLabel(): {
  examLabel: string | null;
  loading: boolean;
} {
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();
  const [examLabel, setExamLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchExam = useCallback(async () => {
    if (!user?.id) {
      setExamLabel(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("user_profiles")
        .select("primary_exam, target_exam")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        setExamLabel(null);
        return;
      }
      setExamLabel(resolveSyllabusExam(data));
    } catch {
      setExamLabel(null);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchExam();
  }, [fetchExam, pathname]);

  useEffect(() => {
    const onProfileUpdated = () => {
      void fetchExam();
    };
    window.addEventListener(KALNEHI_PROFILE_UPDATED_EVENT, onProfileUpdated);
    return () =>
      window.removeEventListener(
        KALNEHI_PROFILE_UPDATED_EVENT,
        onProfileUpdated,
      );
  }, [fetchExam]);

  return { examLabel, loading };
}
