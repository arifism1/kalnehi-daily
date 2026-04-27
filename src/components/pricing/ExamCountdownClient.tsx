"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const EXAMS = [
  { id: "jee-main-jan", label: "JEE Main (January)", date: "2026-01-22" },
  { id: "jee-main-apr", label: "JEE Main (April)", date: "2026-04-01" },
  { id: "jee-advanced", label: "JEE Advanced 2026", date: "2026-05-18" },
  { id: "neet-ug", label: "NEET UG 2026", date: "2026-05-05" },
  { id: "neet-pg", label: "NEET PG 2026", date: "2026-06-15" },
  { id: "upsc-prelims", label: "UPSC CSE Prelims 2026", date: "2026-05-24" },
  { id: "cat-2026", label: "CAT 2026", date: "2026-11-29" },
  { id: "gate-2026", label: "GATE 2026", date: "2026-02-01" },
  { id: "ca-foundation-may", label: "CA Foundation (May)", date: "2026-05-10" },
  { id: "ca-intermediate-may", label: "CA Intermediate (May)", date: "2026-05-03" },
  { id: "ssc-cgl", label: "SSC CGL 2026", date: "2026-09-01" },
  { id: "ibps-po", label: "IBPS PO 2026", date: "2026-10-05" },
  { id: "cuet", label: "CUET 2026", date: "2026-05-15" },
  { id: "custom", label: "Custom exam date", date: "" },
] as const;

function daysBetween(from: Date, to: Date) {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86400000));
}

export function ExamCountdownClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedExam, setSelectedExam] = useState(searchParams.get("exam") ?? "");
  const [customDate, setCustomDate] = useState(searchParams.get("date") ?? "");
  const [copied, setCopied] = useState(false);

  const exam = EXAMS.find((e) => e.id === selectedExam);
  const targetDate = exam?.id === "custom" ? customDate : exam?.date ?? "";
  const target = targetDate ? new Date(targetDate) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = target ? daysBetween(today, target) : null;
  const weeks = days !== null ? Math.floor(days / 7) : null;
  const months = days !== null ? (days / 30.44).toFixed(1) : null;
  const isPast = target ? target < today : false;

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/tools/exam-countdown?exam=${selectedExam}&date=${targetDate}`
    : "";

  const handleCopy = useCallback(() => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [shareUrl]);

  useEffect(() => {
    if (selectedExam) {
      const params = new URLSearchParams({ exam: selectedExam, date: targetDate });
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [selectedExam, targetDate, router]);

  const motivationMsg = days !== null && !isPast ? (
    days > 180 ? "You have time. Don't waste it. Start today." :
    days > 90 ? "Crunch time is coming. Build daily consistency now." :
    days > 30 ? "Critical phase. Every day counts. No breaks." :
    days > 7 ? "Final stretch. Revision only. Trust your preparation." :
    "Exam is this week. Rest, revise, breathe."
  ) : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-kal-text-secondary" htmlFor="exam-select">
          Select your exam
        </label>
        <select
          id="exam-select"
          value={selectedExam}
          onChange={(e) => setSelectedExam(e.target.value)}
          className="w-full rounded-xl border border-kal-border bg-kal-card px-3 py-2.5 text-sm text-kal-text focus:border-kal-accent/60 focus:outline-none"
        >
          <option value="">-- Choose exam --</option>
          {EXAMS.map((e) => (
            <option key={e.id} value={e.id}>{e.label}</option>
          ))}
        </select>
      </div>

      {exam?.id === "custom" && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-kal-text-secondary" htmlFor="custom-date">
            Your exam date
          </label>
          <input
            id="custom-date"
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="w-full rounded-xl border border-kal-border bg-kal-card px-3 py-2 text-sm text-kal-text focus:border-kal-accent/60 focus:outline-none"
          />
        </div>
      )}

      {days !== null && (
        <div className="space-y-4">
          {isPast ? (
            <p className="text-sm text-kal-muted italic">This exam date has passed.</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Days", value: days },
                  { label: "Weeks", value: weeks },
                  { label: "Months", value: months },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-2xl border border-kal-border bg-kal-card p-4 text-center">
                    <p className="text-3xl font-bold text-kal-accent">{value}</p>
                    <p className="text-xs text-kal-muted mt-1">{label}</p>
                  </div>
                ))}
              </div>

              {motivationMsg && (
                <p className="rounded-xl border border-kal-accent/20 bg-kal-accent-soft px-4 py-3 text-sm font-semibold text-kal-accent-dark">
                  {motivationMsg}
                </p>
              )}

              <button
                type="button"
                onClick={handleCopy}
                className="w-full min-h-[44px] rounded-xl border border-kal-border bg-kal-card text-sm font-semibold text-kal-text transition hover:border-kal-accent/40"
              >
                {copied ? "Copied!" : "Copy shareable link"}
              </button>
            </>
          )}
        </div>
      )}

      <div className="border-t border-kal-border pt-4 text-center space-y-2">
        <p className="text-xs text-kal-muted">Track your daily progress and syllabus completion in Kalnehi Daily</p>
        <Link href="/auth" className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-kal-accent px-6 text-sm font-bold text-white transition hover:brightness-105">
          Start free — 3 days on us
        </Link>
      </div>
    </div>
  );
}
