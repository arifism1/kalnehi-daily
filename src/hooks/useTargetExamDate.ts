"use client";

import { useEffect, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

export function useTargetExamDate(): {
  examDate: string | null;
  loading: boolean;
} {
  const user = useAuthStore((s) => s.user);
  const [examDate, setExamDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!user?.id) {
      setExamDate(null);
      setLoading(false);
      return;
    }

    void (async () => {
      setLoading(true);
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("user_profiles")
          .select("target_exam_date")
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;
        if (error) {
          setExamDate(null);
          return;
        }
        const raw = data?.target_exam_date?.trim();
        if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
          setExamDate(raw);
        } else {
          setExamDate(null);
        }
      } catch {
        if (!cancelled) setExamDate(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { examDate, loading };
}
