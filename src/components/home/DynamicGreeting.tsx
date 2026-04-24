"use client";

import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useTargetExamDisplay } from "@/hooks/useTargetExamDisplay";

type ExamUrgency = "calm" | "focused" | "war";

function urgencyForDays(d: number | null): ExamUrgency {
  if (d == null) return "calm";
  if (d > 90) return "calm";
  if (d > 30) return "focused";
  return "war";
}

type DynamicGreetingProps = {
  firstName: string;
};

export function DynamicGreeting({ firstName }: DynamicGreetingProps) {
  const user = useAuthStore((s) => s.user);
  const { examDisplayName, examLabelLoading } = useTargetExamDisplay();
  const [examDate, setExamDate] = useState<string | null>(null);
  const [targetExamName, setTargetExamName] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void (async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from("user_profiles")
        .select("target_exam_date, target_exam, primary_exam, full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const raw = data?.target_exam_date?.trim();
      if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) setExamDate(raw);
      const name =
        (data?.target_exam?.trim() ||
          data?.primary_exam?.trim() ||
          null) as string | null;
      setTargetExamName(name);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const days = useMemo(() => {
    if (!examDate) return null;
    const today = startOfDay(new Date());
    const exam = startOfDay(parseISO(examDate));
    const diff = differenceInCalendarDays(exam, today);
    return diff > 0 ? diff : null;
  }, [examDate]);

  const greetingLead = useMemo(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return "Good morning";
    if (h >= 12 && h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const urgency = urgencyForDays(days);
  const label = targetExamName || examDisplayName || "your exam";
  if (examLabelLoading) {
    return <p className="text-sm text-kal-muted" aria-hidden>…</p>;
  }

  const sub =
    days != null
      ? `Your ${label} is ${days} day${days === 1 ? "" : "s"} away. ${
          days === 1
            ? "Eve is sacred — we saved something for you."
            : urgency === "war"
              ? "War mode. No drift — own this hour."
              : urgency === "focused"
                ? "The window is real. One focused block at a time."
                : "Build today like it compounds — because it does."
        }`
      : `Lock your plan for ${label}. Momentum is built in public — start here.`;

  return (
    <div className="space-y-0.5">
      <p
        className={`text-base font-bold leading-tight sm:text-lg ${
          urgency === "war" ? "text-rose-600 dark:text-rose-400" : "text-kal-text"
        }`}
      >
        {greetingLead}, {firstName}.
      </p>
      <p className="text-sm leading-relaxed text-kal-text-secondary">{sub}</p>
      {days === 1 && (
        <p className="mt-1.5 text-sm font-semibold text-rose-600 dark:text-rose-400">
          <Link href="/eve" className="underline-offset-2 hover:underline">
            Open your Exam Eve ritual
          </Link>
        </p>
      )}
    </div>
  );
}
