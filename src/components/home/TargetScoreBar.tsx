"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

type TargetScoreBarProps = {
  /** Today's plan progress 0-100; drives “closer” microcopy. */
  todayProgressPercent: number;
};

export function TargetScoreBar({ todayProgressPercent }: TargetScoreBarProps) {
  const user = useAuthStore((s) => s.user);
  const [target, setTarget] = useState<number | null>(null);
  const [maxScore, setMaxScore] = useState<number | null>(null);
  const [examName, setExamName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setTarget(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("user_target_blueprints")
          .select("target_clamped, max_score, exam_name")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (error || !data) {
          setTarget(null);
          return;
        }
        setTarget(data.target_clamped);
        setMaxScore(data.max_score);
        setExamName(data.exam_name);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const line = useMemo(() => {
    if (target == null || !maxScore) {
      if (loading) return "Loading your target…";
      return "Set a target in My Target — we’ll show how today moves the needle.";
    }
    const delta = Math.max(0, Math.min(0.5, (todayProgressPercent / 100) * 0.4));
    const disp = (delta * 100).toFixed(1);
    return `You need ${target} in ${examName ?? "your exam"}. Today’s plan gets you ≈${disp}% closer.`;
  }, [target, maxScore, examName, todayProgressPercent, loading]);

  return (
    <div
      className="sticky top-0 z-20 -mx-4 border-b border-kal-border/40 bg-kal-page/90 px-4 py-2.5 text-center shadow-sm backdrop-blur-md sm:mx-0 sm:rounded-xl sm:border sm:py-2"
      role="status"
    >
      <p className="text-[11px] font-semibold leading-snug text-kal-text sm:text-xs">{line}</p>
      {target != null && maxScore != null && (
        <div className="mt-1.5 h-1.5 w-full max-w-sm mx-auto overflow-hidden rounded-full bg-kal-border/40">
          <div
            className="h-full rounded-full bg-kal-accent transition-[width] duration-500"
            style={{ width: `${Math.min(100, (target / maxScore) * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
