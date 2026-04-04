"use client";

import { useCallback, useEffect, useState, startTransition } from "react";

import { PlannerPageShell } from "@/components/planner/PlannerPageShell";

const STORAGE_KEY = "kalnehi-productivity-v1";

type State = {
  notes: string;
  p1: string;
  p2: string;
  p3: string;
};

const defaultState: State = {
  notes: "",
  p1: "",
  p2: "",
  p3: "",
};

function load(): State {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const p = JSON.parse(raw) as Partial<State>;
    return { ...defaultState, ...p };
  } catch {
    return defaultState;
  }
}

export function ProductivityPlannerView() {
  const [s, setS] = useState<State>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      startTransition(() => {
        setS(load());
        setHydrated(true);
      });
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const persist = useCallback((next: State) => {
    setS(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  if (!hydrated) {
    return (
      <PlannerPageShell
        eyebrow="Productivity planner"
        title="NEET / JEE Priority Tasks"
        subtitle="Loading…"
      >
        <div className="h-32 animate-pulse rounded-2xl bg-slate-800/50" />
      </PlannerPageShell>
    );
  }

  return (
    <PlannerPageShell
      eyebrow="Productivity planner"
      title="NEET / JEE Priority Tasks"
      subtitle="Three rank-moving priorities and a scratchpad for high-yield revision blocks. Saved on this device only."
    >
      <div className="space-y-3">
        {(["p1", "p2", "p3"] as const).map((key, i) => (
          <label key={key} className="block">
            <span className="text-xs font-medium text-zinc-500">
              Priority {i + 1} · marks impact
            </span>
            <input
              type="text"
              value={s[key]}
              onChange={(e) => persist({ ...s, [key]: e.target.value })}
              placeholder={
                i === 0
                  ? "e.g. Electrostatics PYQs + mistakes"
                  : "e.g. Organic name reactions drill"
              }
              className="mt-1.5 min-h-[48px] w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-2.5 text-[15px] text-white placeholder:text-zinc-600 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>
        ))}
      </div>
      <label className="block">
        <span className="text-xs font-medium text-zinc-500">
          Focus notes & revision blocks
        </span>
        <textarea
          value={s.notes}
          onChange={(e) => persist({ ...s, notes: e.target.value })}
          rows={6}
          placeholder="High-yield topics for this week, mock analysis takeaways, coach assignments…"
          className="mt-1.5 w-full resize-y rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
      </label>
    </PlannerPageShell>
  );
}
