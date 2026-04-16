"use client";

import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useId, useState, startTransition } from "react";

import { PlannerPageShell } from "@/components/planner/PlannerPageShell";

const STORAGE_KEY = "kalnehi-habits-v1";

type Habit = { id: string; label: string; streak: number };

function load(): Habit[] {
  if (typeof window === "undefined") return defaultHabits();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultHabits();
    const parsed = JSON.parse(raw) as Habit[];
    return Array.isArray(parsed) && parsed.length ? parsed : defaultHabits();
  } catch {
    return defaultHabits();
  }
}

function defaultHabits(): Habit[] {
  return [
    {
      id: "1",
      label: "Solve 50 PYQs (or 1 full timed section)",
      streak: 0,
    },
    {
      id: "2",
      label: "Revise one weak chapter end-to-end",
      streak: 0,
    },
    {
      id: "3",
      label: "Mock test analysis — top 10 mistakes",
      streak: 0,
    },
  ];
}

export function HabitsPlannerView() {
  const baseId = useId();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      startTransition(() => {
        setHabits(load());
        setHydrated(true);
      });
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const save = useCallback((next: Habit[]) => {
    setHabits(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const bump = (id: string) => {
    save(
      habits.map((h) =>
        h.id === id ? { ...h, streak: h.streak + 1 } : h,
      ),
    );
  };

  const remove = (id: string) => {
    save(habits.filter((h) => h.id !== id));
  };

  const add = () => {
    const label = window.prompt("Habit label (exam-focused):");
    if (!label?.trim()) return;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `h-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    save([...habits, { id, label: label.trim(), streak: 0 }]);
  };

  if (!hydrated) {
    return (
      <PlannerPageShell
        eyebrow="Habit tracker"
        title="Daily PYQ & Weak Topic Discipline"
        subtitle="Loading…"
      >
        <div className="h-40 animate-pulse rounded-2xl bg-kal-border/60" />
      </PlannerPageShell>
    );
  }

  return (
    <PlannerPageShell
      eyebrow="Habit tracker"
      title="Daily PYQ & Weak Topic Discipline"
      subtitle="Build non-negotiable exam habits. Tap +1 when you complete a habit today — streaks are local to this device."
    >
      <ul className="space-y-3">
        {habits.map((h) => (
          <li
            key={h.id}
            className="kal-glass-panel flex items-start gap-3 rounded-2xl p-4 dark:border-white/12"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-kal-text">{h.label}</p>
              <p className="mt-1 text-xs text-kal-muted">
                Streak:{" "}
                <span className="font-semibold tabular-nums text-kal-accent">
                  {h.streak}
                </span>{" "}
                days logged
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <button
                type="button"
                onClick={() => bump(h.id)}
                className="kal-btn-accent rounded-xl px-3 py-2 text-xs font-semibold active:opacity-80"
                aria-label={`Log ${h.label}`}
              >
                +1 today
              </button>
              <button
                type="button"
                onClick={() => remove(h.id)}
                className="rounded-xl p-2 text-kal-muted hover:bg-kal-danger-soft hover:text-kal-danger-text"
                aria-label="Remove habit"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={add}
        className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-dashed border-kal-accent/40 py-3 text-sm font-semibold text-kal-accent hover:bg-kal-accent-soft"
      >
        <Plus className="h-4 w-4" />
        Add exam habit
      </button>
      <p id={`${baseId}-hint`} className="text-[11px] text-kal-text-secondary">
        Reset streaks manually by editing habits in a future update — for now,
        use +1 as an honest daily log.
      </p>
    </PlannerPageShell>
  );
}
