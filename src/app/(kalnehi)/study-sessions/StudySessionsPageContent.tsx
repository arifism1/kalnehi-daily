"use client";

import { BookOpen, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AddStudySessionSheet } from "@/components/study/AddStudySessionSheet";
import { StudySessionsLog } from "@/components/study/StudySessionsLog";
import { getAllStudySessions, type StudySessionLog } from "@/lib/studySessionsIdb";
import { refreshStudySessionsFromServer } from "@/lib/refreshStudySessionsFromServer";
import { useAuthStore } from "@/store/useAuthStore";

export default function StudySessionsPageContent() {
  const userId = useAuthStore((s) => s.user?.id);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sessions, setSessions] = useState<StudySessionLog[]>([]);

  const load = useCallback(async () => {
    const rows = await getAllStudySessions();
    setSessions(rows);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const on = () => void load();
    window.addEventListener("kalnehi-study-sessions-changed", on);
    return () => window.removeEventListener("kalnehi-study-sessions-changed", on);
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    void refreshStudySessionsFromServer().then(() => load());
  }, [userId, load]);

  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
          Study log
        </p>
        <h1 className="mt-1 flex items-center gap-2 text-xl font-bold tracking-tight text-kal-text sm:text-2xl">
          <BookOpen className="h-7 w-7 text-kal-accent" aria-hidden />
          Study sessions
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-kal-muted sm:text-[15px]">
          Claim focused study time, or use the camera mode for accountability.
          Your progress stays in sync across devices when you&apos;re signed in.
        </p>
        <div className="mt-4 rounded-2xl border border-kal-accent/25 bg-kal-accent-soft px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-kal-accent">
            Privacy
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-red-900 dark:text-red-100/85">
            Camera sessions use AI only on your device (MediaPipe in the
            browser). Video is never streamed, uploaded, or saved on our servers.
            Your log only stores subject, duration, and times—never images or
            recordings.
          </p>
        </div>
      </header>

      <button
        type="button"
        disabled={!userId}
        onClick={() => setSheetOpen(true)}
        className="flex w-full min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-kal-accent px-4 text-base font-bold text-kal-accent-foreground shadow-sm transition-transform hover:bg-kal-accent-hover active:scale-[0.99] disabled:opacity-50"
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} />
        Add study session
      </button>

      {!userId ? (
        <p className="text-center text-sm text-kal-muted">
          Sign in to log and sync study sessions.
        </p>
      ) : null}

      <section
        aria-labelledby="study-sessions-all-heading"
        className="rounded-2xl border border-kal-border bg-kal-card p-6 kal-shadow-card sm:p-8"
      >
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="study-sessions-all-heading" className="text-sm font-bold text-kal-text">
            All sessions
          </h2>
          <Link
            href="/daily-log#study-sessions-log"
            className="text-[11px] font-semibold uppercase tracking-wide text-kal-accent hover:text-kal-accent-hover"
          >
            Daily log →
          </Link>
        </div>
        <ul className="mt-4 space-y-2">
          <StudySessionsLog
            sessions={sessions}
            emptyMessage="No study sessions yet - add your first session to start building momentum."
          />
        </ul>
      </section>

      <AddStudySessionSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  );
}
