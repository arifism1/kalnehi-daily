"use client";

import { PlannerPageShell } from "@/components/planner/PlannerPageShell";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function WeeklyPlannerView() {
  return (
    <PlannerPageShell
      eyebrow="Weekly planner"
      title="Weekly Chapter Targets"
      subtitle="Assign chapters and high-yield topics per day. Aim for balance across Physics, Chemistry, and Biology/Math — not heroic single-subject marathons that burn you out before mocks."
    >
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-[36rem] gap-2">
          {days.map((d) => (
            <div
              key={d}
              className="kal-glass-card min-w-[4.5rem] flex-1 rounded-xl border border-kal-border p-2"
            >
              <p className="text-center text-[11px] font-bold text-kal-accent">
                {d}
              </p>
              <div className="mt-2 min-h-[5rem] rounded-lg border border-dashed border-kal-border/50 bg-kal-card/50" />
            </div>
          ))}
        </div>
      </div>
      <ul className="kal-glass-subtle space-y-2 rounded-2xl border border-kal-border p-4 text-sm text-kal-muted">
        <li className="flex gap-2">
          <span className="text-kal-accent">→</span>
          Write one &quot;must finish&quot; chapter per subject per week.
        </li>
        <li className="flex gap-2">
          <span className="text-kal-accent">→</span>
          Leave one half-day for PYQ review and mistake analysis.
        </li>
      </ul>
    </PlannerPageShell>
  );
}
