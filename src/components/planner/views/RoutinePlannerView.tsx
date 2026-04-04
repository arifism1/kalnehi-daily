"use client";

import { PlannerPageShell } from "@/components/planner/PlannerPageShell";

const blocks = [
  {
    label: "Morning · High yield",
    hint: "Theory + new concepts — when focus is freshest",
    accent: "from-emerald-600/20 to-teal-600/10",
  },
  {
    label: "Afternoon · PYQ & drills",
    hint: "Timed practice, previous-year patterns, error log",
    accent: "from-violet-600/15 to-slate-900/40",
  },
  {
    label: "Evening · Revision & weak topics",
    hint: "Spaced recall, flash notes, chapter consolidation",
    accent: "from-amber-600/15 to-slate-900/40",
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
            className={`rounded-2xl border border-slate-700/80 bg-gradient-to-br p-4 ${b.accent}`}
          >
            <p className="text-sm font-semibold text-white">{b.label}</p>
            <p className="mt-1 text-xs text-zinc-400">{b.hint}</p>
            <div className="mt-3 rounded-xl border border-dashed border-slate-600/60 bg-slate-950/40 px-3 py-6 text-center text-xs text-zinc-500">
              Tap your real slots in a notebook or calendar — we keep this view
              clean so you execute, not configure forever.
            </div>
          </div>
        ))}
      </section>
      <p className="text-center text-[11px] text-zinc-600">
        Pair with the main <span className="text-zinc-400">Plan</span> tab for
        concrete task names; use this page to defend your peak hours.
      </p>
    </PlannerPageShell>
  );
}
