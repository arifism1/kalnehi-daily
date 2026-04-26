"use client";

import { useEffect, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

export function useTargetExamDate(): {
  examDate: string | null;
  examDates: Record<string, string>;
  loading: boolean;
} {
  const user = useAuthStore((s) => s.user);
  const [examDate, setExamDate] = useState<string | null>(null);
  const [examDates, setExamDates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!user?.id) {
      setExamDate(null);
      setExamDates({});
      setLoading(false);
      return;
    }

    void (async () => {
      setLoading(true);
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("user_profiles")
          .select("target_exam_date, exam_dates, target_exam, primary_exam")
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;
        if (error) {
          setExamDate(null);
          setExamDates({});
          return;
        }

        const raw = data?.target_exam_date?.trim();
        if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
          setExamDate(raw);
        } else {
          setExamDate(null);
        }

        // Hydrate per-exam dates from the new column; fall back to the legacy
        // single date keyed under the primary exam for users who haven't resaved.
        const dbMap =
          data?.exam_dates &&
          typeof data.exam_dates === "object" &&
          !Array.isArray(data.exam_dates)
            ? (data.exam_dates as Record<string, string>)
            : {};
        if (Object.keys(dbMap).length > 0) {
          setExamDates(dbMap);
        } else if (raw) {
          const pk = data?.target_exam?.trim() || data?.primary_exam?.trim() || "";
          setExamDates(pk ? { [pk]: raw } : {});
        } else {
          setExamDates({});
        }
      } catch {
        if (!cancelled) {
          setExamDate(null);
          setExamDates({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { examDate, examDates, loading };
}
