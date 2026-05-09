"use client";

import { useState } from "react";
import Link from "next/link";

interface CalcResult {
  totalHoursNeeded: number;
  availableTotalHours: number;
  hoursPerDay: number;
  feasibility: "comfortable" | "tight" | "critical" | "impossible";
  recommendedHoursPerDay: number;
  message: string;
}

function calculate(
  examDate: string,
  topicsRemaining: number,
  hoursPerTopicFirst: number,
  revisionFactor: number,
  mockHours: number,
  hoursAvailablePerDay: number,
): CalcResult | null {
  if (!examDate || topicsRemaining <= 0 || hoursAvailablePerDay <= 0) return null;

  const today = new Date();
  const exam = new Date(examDate);
  const daysRemaining = Math.max(0, Math.floor((exam.getTime() - today.getTime()) / 86400000));

  if (daysRemaining === 0) return null;

  // Study days (accounting for ~15% unavailability from sick days, emergencies, etc.)
  const effectiveStudyDays = Math.floor(daysRemaining * 0.85);

  const firstReadingHours = topicsRemaining * hoursPerTopicFirst;
  const revisionHours = firstReadingHours * revisionFactor;
  const totalHoursNeeded = firstReadingHours + revisionHours + mockHours;

  const availableTotalHours = effectiveStudyDays * hoursAvailablePerDay;
  const recommendedHoursPerDay = Math.ceil((totalHoursNeeded / effectiveStudyDays) * 10) / 10;

  const ratio = availableTotalHours / totalHoursNeeded;

  let feasibility: CalcResult["feasibility"];
  let message: string;

  if (ratio >= 1.3) {
    feasibility = "comfortable";
    message = `You have ${Math.round(availableTotalHours - totalHoursNeeded)} extra hours of buffer. Use them for additional mock tests and deeper revision cycles.`;
  } else if (ratio >= 1.0) {
    feasibility = "tight";
    message = `Achievable but tight. You need every study day to count. No extended breaks. Write mock tests every 10-12 days.`;
  } else if (ratio >= 0.75) {
    feasibility = "critical";
    message = `You're short on time. Prioritise high-weightage topics first. Drop low-yield chapters entirely. Write mocks weekly for rapid feedback.`;
  } else {
    feasibility = "impossible";
    message = `The timeline is very challenging at ${hoursAvailablePerDay} hours/day. You'll need to either extend your study hours significantly or focus exclusively on the highest-weightage topics.`;
  }

  return {
    totalHoursNeeded: Math.round(totalHoursNeeded),
    availableTotalHours: Math.round(availableTotalHours),
    hoursPerDay: hoursAvailablePerDay,
    feasibility,
    recommendedHoursPerDay,
    message,
  };
}

const FEASIBILITY_CONFIG = {
  comfortable: { label: "Comfortable", color: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/20" },
  tight: { label: "Tight but achievable", color: "text-amber-600", bg: "bg-amber-500/10 border-amber-500/20" },
  critical: { label: "Critical — prioritise ruthlessly", color: "text-orange-600", bg: "bg-orange-500/10 border-orange-500/20" },
  impossible: { label: "Very challenging", color: "text-red-600", bg: "bg-red-500/10 border-red-500/20" },
};

export function StudyHoursCalculatorClient() {
  const [examDate, setExamDate] = useState("");
  const [topics, setTopics] = useState(50);
  const [hoursPerTopic, setHoursPerTopic] = useState(6);
  const [revisionFactor, setRevisionFactor] = useState(0.4);
  const [mockHours, setMockHours] = useState(30);
  const [hoursPerDay, setHoursPerDay] = useState(6);
  const [result, setResult] = useState<CalcResult | null>(null);

  function handleCalculate() {
    const r = calculate(examDate, topics, hoursPerTopic, revisionFactor, mockHours, hoursPerDay);
    setResult(r);
  }

  const fc = result ? FEASIBILITY_CONFIG[result.feasibility] : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-kal-text-secondary uppercase tracking-wide" htmlFor="exam-date">
            Exam date
          </label>
          <input
            id="exam-date"
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="w-full rounded-xl border border-kal-border bg-kal-card px-3 py-2 text-sm text-kal-text focus:border-kal-accent/60 focus:outline-none focus:ring-1 focus:ring-kal-accent/30"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-kal-text-secondary uppercase tracking-wide" htmlFor="topics">
            Topics / chapters remaining: <strong className="text-kal-text">{topics}</strong>
          </label>
          <input id="topics" type="range" min={5} max={200} value={topics} onChange={(e) => setTopics(+e.target.value)}
            className="w-full accent-kal-accent" />
          <div className="flex justify-between text-[10px] text-kal-muted"><span>5</span><span>200</span></div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-kal-text-secondary uppercase tracking-wide" htmlFor="hrs-topic">
            Hours per topic (first read): <strong className="text-kal-text">{hoursPerTopic}h</strong>
          </label>
          <input id="hrs-topic" type="range" min={2} max={12} value={hoursPerTopic} onChange={(e) => setHoursPerTopic(+e.target.value)}
            className="w-full accent-kal-accent" />
          <div className="flex justify-between text-[10px] text-kal-muted"><span>2h (easy)</span><span>12h (complex)</span></div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-kal-text-secondary uppercase tracking-wide" htmlFor="hrs-day">
            Hours available per day: <strong className="text-kal-text">{hoursPerDay}h</strong>
          </label>
          <input id="hrs-day" type="range" min={1} max={14} value={hoursPerDay} onChange={(e) => setHoursPerDay(+e.target.value)}
            className="w-full accent-kal-accent" />
          <div className="flex justify-between text-[10px] text-kal-muted"><span>1h</span><span>14h</span></div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleCalculate}
        className="w-full min-h-[48px] rounded-xl bg-kal-accent px-6 text-sm font-bold text-white transition hover:brightness-105 active:scale-[0.99]"
      >
        Calculate
      </button>

      {result && fc && (
        <div className={`rounded-2xl border p-5 space-y-4 ${fc.bg}`}>
          <div className="space-y-1">
            <p className={`text-base font-bold ${fc.color}`}>{fc.label}</p>
            <p className="text-sm text-kal-text-secondary">{result.message}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: "Total hours needed", value: `${result.totalHoursNeeded}h` },
              { label: "Hours available", value: `${result.availableTotalHours}h` },
              { label: "Recommended daily", value: `${result.recommendedHoursPerDay}h/day` },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-kal-card/80 p-3 text-center">
                <p className="text-lg font-bold text-kal-text">{value}</p>
                <p className="text-[10px] text-kal-muted leading-tight mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-kal-border pt-3 text-center">
            <p className="text-xs text-kal-muted">
              For a daily syllabus tracker and AI-powered study strategy:
            </p>
            <Link href="/auth" className="mt-2 inline-flex min-h-[40px] items-center justify-center rounded-xl bg-kal-accent px-5 text-sm font-bold text-white transition hover:brightness-105">
              Start free — 7 days on us
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
