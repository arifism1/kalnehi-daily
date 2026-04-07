"use client";

import { PlannerPageShell } from "@/components/planner/PlannerPageShell";

const rows = [
  { t: "05:00 – 08:00", kind: "Deep work", note: "Theory / new chapters" },
  { t: "08:00 – 09:30", kind: "Fuel & reset", note: "Breakfast, movement" },
  { t: "09:30 – 12:30", kind: "PYQ blocks", note: "Timed sets + error log" },
  { t: "12:30 – 14:00", kind: "Break / health", note: "Non-negotiable recovery" },
  { t: "14:00 – 18:00", kind: "Revision / coaching", note: "Weak topics, tests" },
  { t: "18:00 – 22:00", kind: "Second wind", note: "Notes, flashcards, planning" },
] as const;

export function SchedulePlannerView() {
  return (
    <PlannerPageShell
      eyebrow="Schedule planner"
      title="Today's Timetable"
      subtitle="Marks-focused schedule: protect deep work, revision, and health. Rename rows to match your exam (NEET, JEE, Boards) — the split matters more than the exact hours."
    >
      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.t}
            className="flex flex-col gap-1 rounded-xl border border-kal-border bg-kal-card px-4 py-4 kal-shadow-card sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-xs font-semibold tabular-nums text-kal-accent">
                {r.t}
              </p>
              <p className="text-sm font-medium text-white">{r.kind}</p>
            </div>
            <p className="text-xs text-kal-muted">{r.note}</p>
          </div>
        ))}
      </div>
      <p className="text-center text-[11px] text-kal-text-secondary">
        Template only — adapt to your hostel, school, or home constraints.
      </p>
    </PlannerPageShell>
  );
}
