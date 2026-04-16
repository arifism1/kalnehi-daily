"use client";

import { PlannerPageShell } from "@/components/planner/PlannerPageShell";

const blocks = [
  {
    label: "Morning · High yield",
    hint: "Theory + new concepts — when focus is freshest",
    accent:
      "from-kal-accent-soft to-orange-100 dark:from-orange-600/20 dark:to-orange-700/10",
  },
  {
    label: "Afternoon · PYQ & drills",
    hint: "Timed practice, previous-year patterns, error log",
    accent:
      "from-violet-50 to-kal-card-muted dark:from-violet-600/15 dark:to-slate-900/40",
  },
  {
    label: "Evening · Revision & weak topics",
    hint: "Spaced recall, flash notes, chapter consolidation",
    accent:
      "from-amber-50 to-kal-card-muted dark:from-amber-600/15 dark:to-slate-900/40",
  },
] as const;

export function RoutinePlannerView() {
  return (
    <PlannerPageShell
      eyebrow="Routine planner"
      title="Today's Study Schedule"
      subtitle="Block your day into marks-focused sprints. Adjust blocks to match your coaching or self-study rhythm — the structure beats vague intent."
    >
      <section className="space-y-3" aria-label="Time blocks">
        {blocks.map((b) => (
          <div
            key={b.label}
            className={`rounded-2xl border border-kal-border bg-gradient-to-br p-5 kal-shadow-card dark:border-slate-700/80 ${b.accent}`}
          >
            <p className="text-sm font-semibold text-kal-text">{b.label}</p>
            <p className="mt-1 text-xs text-kal-muted">{b.hint}</p>
            <div className="mt-3 rounded-xl border border-dashed border-kal-border bg-kal-card/80 px-4 py-6 text-center text-xs text-kal-muted dark:border-slate-600/60 dark:bg-slate-950/40">
              Tap your real slots in a notebook or calendar — we keep this view
              clean so you execute, not configure forever.
            </div>
          </div>
        ))}
      </section>
      <p className="text-center text-[11px] text-kal-text-secondary">
        Pair with the main <span className="text-kal-muted">Plan</span> tab for
        concrete task names; use this page to defend your peak hours.
      </p>
    </PlannerPageShell>
  );
}
