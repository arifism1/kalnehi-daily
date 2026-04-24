"use client";

import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { fetchDailyPlanTasksForClient } from "@/lib/fetchDailyPlanTasksForClient";
import { TapBounce } from "@/components/ui/TapBounce";

export default function MorningRitualPage() {
  const user = useAuthStore((s) => s.user);
  const today = useCalendarDate();
  const [tasks, setTasks] = useState<string[]>([]);
  const [name, setName] = useState("Aspirant");
  const [examDate, setExamDate] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const supabase = getSupabaseBrowserClient();
    void (async () => {
      const { data } = await supabase
        .from("user_profiles")
        .select("target_exam_date, full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.target_exam_date) setExamDate(data.target_exam_date.trim() || null);
      if (data?.full_name?.trim()) {
        setName(data.full_name.trim().split(/\s+/)[0] ?? "Aspirant");
      }
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    void (async () => {
      const r = await fetchDailyPlanTasksForClient(today);
      if (!r.ok) return;
      setTasks(
        r.tasks
          .filter((t) => t.status === "pending")
          .map((t) => t.title)
          .slice(0, 3),
      );
    })();
  }, [user?.id, today]);

  const days = useMemo(() => {
    if (!examDate) return null;
    const d = differenceInCalendarDays(
      startOfDay(parseISO(examDate)),
      startOfDay(new Date()),
    );
    return d > 0 ? d : null;
  }, [examDate]);

  return (
    <div className="mx-auto min-h-dvh max-w-2xl bg-gradient-to-b from-zinc-950 via-zinc-900 to-black px-4 pb-16 pt-4 text-zinc-50 sm:pt-8">
      <Link href="/" className="text-sm font-semibold text-amber-400 hover:underline">
        ← War Room
      </Link>
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8"
      >
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400/80">
          Morning ritual
        </p>
        <h1 className="mt-2 font-serif text-3xl font-bold">
          {name}, your battle plan
        </h1>
        {days != null && (
          <p className="mt-2 text-sm text-amber-200/90">
            {days} day{days === 1 ? "" : "s"} to go. What you do before noon sets the week.
          </p>
        )}
      </motion.header>

      <section className="mt-10 space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500">
          Three to win
        </h2>
        {tasks.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-700 p-4 text-sm text-zinc-400">
            No open tasks in Battle Plan today — go build a lean list, then return here to feel the mission.
            <br />
            <Link href="/plan-my-day" className="mt-2 inline-block font-semibold text-amber-400">
              Plan my day
            </Link>
          </p>
        ) : (
          <ol className="space-y-2">
            {tasks.map((t, i) => (
              <TapBounce key={i} compact>
                <li className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm font-semibold text-zinc-100">
                  {i + 1}. {t}
                </li>
              </TapBounce>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
