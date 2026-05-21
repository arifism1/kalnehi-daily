"use client";

import { motion } from "framer-motion";
import { Mic } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { useCalendarDate } from "@/hooks/useCalendarDate";
import { fetchDailyPlanTasksForClient } from "@/lib/fetchDailyPlanTasksForClient";
import * as storage from "@/lib/storage";
import { useAuthStore } from "@/store/useAuthStore";

const STORAGE_PREFIX = "kalnehi-daily-voice-nudge";

const MAX_SHOWS_PER_DAY = 2;

/**
 * Prompts twice per calendar day on app open/resume when today has no daily tasks yet.
 */
export function DailyVoiceNudge() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const today = useCalendarDate();
  const [open, setOpen] = useState(false);

  const openRef = useRef(false);
  const lockRef = useRef(false);
  const wasHiddenRef = useRef(false);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const maybeShow = useCallback(async () => {
    const userId = user?.id ?? null;
    if (!userId || lockRef.current || openRef.current) return;

    lockRef.current = true;
    try {
      const key = `${STORAGE_PREFIX}:${userId}:${today}`;
      let count = parseInt((await storage.getItem(key)) ?? "0", 10);
      if (count >= MAX_SHOWS_PER_DAY) return;

      const plan = await fetchDailyPlanTasksForClient(today);
      if (!plan.ok || plan.tasks.length > 0) return;

      count = parseInt((await storage.getItem(key)) ?? "0", 10);
      if (count >= MAX_SHOWS_PER_DAY) return;

      await storage.setItem(key, String(count + 1));
      setOpen(true);
    } finally {
      lockRef.current = false;
    }
  }, [today, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setOpen(false);
      return;
    }

    void maybeShow();

    wasHiddenRef.current = document.visibilityState === "hidden";
    function onVisibility() {
      const nowHidden = document.visibilityState === "hidden";
      const resumedVisible = wasHiddenRef.current && !nowHidden;
      wasHiddenRef.current = nowHidden;
      if (!resumedVisible) return;
      void maybeShow();
    }

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [maybeShow, user?.id]);

  function handleDictateDay() {
    setOpen(false);
    router.push("/dictate-day");
  }

  function handleDismiss() {
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-kal-overlay backdrop-blur-sm"
        onClick={handleDismiss}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-voice-nudge-title"
        aria-describedby="daily-voice-nudge-desc"
        className="kal-glass-panel relative z-[81] w-full max-w-sm overflow-hidden rounded-2xl"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex flex-col items-center px-6 pb-6 pt-8 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-kal-accent/12">
            <Mic className="size-7 text-kal-accent" strokeWidth={1.75} />
          </div>

          <h2
            id="daily-voice-nudge-title"
            className="text-[18px] font-semibold leading-snug tracking-tight text-kal-text"
          >
            Plan your day with your voice
          </h2>

          <p
            id="daily-voice-nudge-desc"
            className="mt-2.5 text-[13px] leading-relaxed text-kal-text-secondary"
          >
            Tap below to dictate your tasks for today.
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-kal-border/50 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={handleDictateDay}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-kal-accent px-4 py-3 text-[14px] font-semibold text-white transition-opacity active:opacity-80 sm:min-h-[44px]"
          >
            <Mic className="size-4" strokeWidth={2} aria-hidden />
            Dictate my day
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="kal-glass-subtle min-h-[48px] w-full rounded-xl px-4 py-3 text-[14px] font-semibold text-kal-text sm:min-h-[44px]"
          >
            Maybe later
          </button>
        </div>
      </motion.div>
    </div>
  );
}
