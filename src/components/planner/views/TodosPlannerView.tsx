"use client";

import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, startTransition } from "react";

import { PlannerPageShell } from "@/components/planner/PlannerPageShell";

const STORAGE_KEY = "kalnehi-exam-todos-v1";

type Priority = "high" | "med" | "low";

type Todo = {
  id: string;
  text: string;
  priority: Priority;
  done: boolean;
};

function load(): Todo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as Todo[];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

const priorityStyle: Record<Priority, string> = {
  high: "border-rose-500/40 bg-rose-950/20 text-rose-200",
  med: "border-amber-500/35 bg-amber-950/15 text-amber-100",
  low: "border-slate-600 bg-slate-900/50 text-zinc-300",
};

export function TodosPlannerView() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      startTransition(() => {
        setTodos(load());
        setHydrated(true);
      });
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const save = useCallback((next: Todo[]) => {
    setTodos(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const add = () => {
    const text = window.prompt("Quick exam to-do:");
    if (!text?.trim()) return;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `t-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    save([
      ...todos,
      {
        id,
        text: text.trim(),
        priority: "high",
        done: false,
      },
    ]);
  };

  const cyclePriority = (id: string) => {
    const order: Priority[] = ["high", "med", "low"];
    save(
      todos.map((t) => {
        if (t.id !== id) return t;
        const i = order.indexOf(t.priority);
        const next = order[(i + 1) % order.length]!;
        return { ...t, priority: next };
      }),
    );
  };

  if (!hydrated) {
    return (
      <PlannerPageShell
        eyebrow="To-do list"
        title="Quick Exam To-Dos"
        subtitle="Loading…"
      >
        <div className="h-32 animate-pulse rounded-2xl bg-slate-800/50" />
      </PlannerPageShell>
    );
  }

  return (
    <PlannerPageShell
      eyebrow="To-do list"
      title="Quick Exam To-Dos"
      subtitle="Rank by urgency for your upcoming test — tap priority to cycle high → medium → low. Separate from your main Plan tab; use this for fast capture."
    >
      {todos.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-600 px-4 py-10 text-center text-sm text-zinc-500">
          No to-dos yet. Add rank-critical items — formula sheets, mock review,
          chapter deadlines.
        </p>
      ) : (
        <ul className="space-y-2">
          {todos.map((t) => (
            <li
              key={t.id}
              className={`flex items-start gap-3 rounded-xl border px-3 py-3 ${priorityStyle[t.priority]}`}
            >
              <input
                type="checkbox"
                checked={t.done}
                onChange={() =>
                  save(
                    todos.map((x) =>
                      x.id === t.id ? { ...x, done: !x.done } : x,
                    ),
                  )
                }
                className="mt-1 h-5 w-5 rounded border-slate-500 bg-slate-950 text-kal-accent"
              />
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${t.done ? "text-zinc-500 line-through" : "text-white"}`}
                >
                  {t.text}
                </p>
                <button
                  type="button"
                  onClick={() => cyclePriority(t.id)}
                  className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 hover:text-kal-accent"
                >
                  Priority: {t.priority}
                </button>
              </div>
              <button
                type="button"
                onClick={() => save(todos.filter((x) => x.id !== t.id))}
                className="rounded-lg p-2 text-zinc-500 hover:bg-black/20 hover:text-rose-300"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={add}
        className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-kal-accent py-3.5 text-sm font-semibold text-white shadow-lg shadow-red-900/20"
      >
        <Plus className="h-4 w-4" />
        Add to-do
      </button>
    </PlannerPageShell>
  );
}
