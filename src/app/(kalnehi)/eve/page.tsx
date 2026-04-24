"use client";

import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

export default function ExamEvePage() {
  const user = useAuthStore((s) => s.user);
  const [name, setName] = useState("Aspirant");
  const [days, setDays] = useState<number | null>(null);
  const [xp, setXp] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    void (async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from("user_profiles")
        .select("target_exam_date, full_name, xp")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.full_name?.trim()) {
        setName(data.full_name.trim().split(/\s+/)[0] ?? "Aspirant");
      }
      if (typeof data?.xp === "number") setXp(data.xp);
      const raw = data?.target_exam_date?.trim();
      if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        const d = differenceInCalendarDays(
          startOfDay(parseISO(raw)),
          startOfDay(new Date()),
        );
        setDays(d);
      } else {
        setDays(null);
      }
    })();
  }, [user?.id]);

  if (days != null && days > 1) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-sm text-kal-muted">
          This ritual unlocks the night before your exam ({days} days to go).
        </p>
        <Link href="/" className="mt-4 inline-block font-semibold text-kal-accent">
          War Room
        </Link>
      </div>
    );
  }

  if (days == null) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center text-sm text-kal-muted">
        Set your exam date in settings so we can be here for you the night before.
        <br />
        <Link href="/settings" className="mt-3 inline-block font-semibold text-kal-accent">
          Settings
        </Link>
      </div>
    );
  }

  if (days !== 1) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center text-sm text-kal-muted">
        {days === 0
          ? "Exam day. Breathe — you built the base. War Room has your back."
          : "This chapter is closed. New mission ahead in War Room."}
        <br />
        <Link href="/" className="mt-4 inline-block font-semibold text-kal-accent">
          War Room
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-2xl bg-gradient-to-b from-rose-950 via-zinc-950 to-black px-4 pb-20 pt-8 text-rose-50">
      <Link href="/" className="text-sm font-semibold text-rose-200 hover:underline">
        ← War Room
      </Link>
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 text-center"
      >
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-rose-300/80">Exam eve</p>
        <h1 className="mt-3 font-serif text-3xl font-bold leading-tight sm:text-4xl">
          Tomorrow is your day, {name}.
        </h1>
        <p className="mt-4 text-base text-rose-200/90">
          Everything you logged — the streaks, the reps, the discipline — is already inside you. Walk in like you&rsquo;ve been ready for this.
        </p>
        <p className="mt-3 text-sm text-rose-200/60">
          Kalnehi XP banked: <span className="font-mono font-bold text-amber-200">{xp}</span> — proof you did not go quiet.
        </p>
      </motion.header>
    </div>
  );
}
