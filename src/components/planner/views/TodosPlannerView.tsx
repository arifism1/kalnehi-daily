"use client";

import { Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, startTransition } from "react";

import { PlannerPageShell } from "@/components/planner/PlannerPageShell";
import {
  hydrateUserPlannerTextFromServer,
  plannerTextSetTodos,
} from "@/lib/userPlannerTextClient";
import { getUserPlannerTextBundleCached } from "@/lib/userPlannerTextLocal";
import type { PlannerTodoState } from "@/lib/userPlannerTextTypes";
import { useAuthStore } from "@/store/useAuthStore";

const STORAGE_KEY = "kalnehi-exam-todos-v1";

type Priority = "high" | "med" | "low";

type Todo = {
  id: string;
  text: string;
  priority: Priority;
  done: boolean;
};

function loadLocal(): Todo[] {
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

function saveLocal(rows: Todo[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

function localRowsToStates(rows: Todo[]): PlannerTodoState[] {
  const ts = new Date().toISOString();
  return rows.map((t, i) => ({
    id: t.id,
    text: t.text,
    priority: t.priority,
    done: t.done,
    position: i,
    updatedAt: ts,
    createdAt: ts,
  }));
}

function statesToLocal(rows: PlannerTodoState[]): Todo[] {
  return rows.map(({ id, text, priority, done }) => ({
    id,
    text,
    priority,
    done,
  }));
}

const priorityStyle: Record<Priority, string> = {
  high: "border-orange-500/40 bg-kal-accent-soft text-kal-accent-dark",
  med: "border-amber-500/35 bg-amber-950/15 text-amber-100",
  low: "border-kal-border bg-kal-card-muted text-kal-muted",
};

export function TodosPlannerView() {
  const userId = useAuthStore((s) => s.user?.id);
  const [todos, setTodos] = useState<PlannerTodoState[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      startTransition(() => {
        void (async () => {
          if (!userId) {
            setTodos(localRowsToStates(loadLocal()));
            setHydrated(true);
            return;
          }
          const bundle = await hydrateUserPlannerTextFromServer(userId);
          setTodos(bundle.todos);
          setHydrated(true);
        })();
      });
    });
    return () => cancelAnimationFrame(id);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const onPlanner = () => {
      void getUserPlannerTextBundleCached(userId).then((b) => {
        if (b) setTodos(b.todos);
      });
    };
    window.addEventListener("kalnehi-user-planner-text-changed", onPlanner);
    return () =>
      window.removeEventListener(
        "kalnehi-user-planner-text-changed",
        onPlanner,
      );
  }, [userId]);

  const save = useCallback(
    (next: PlannerTodoState[]) => {
      const positioned = next.map((t, i) => ({ ...t, position: i }));
      setTodos(positioned);
      if (!userId) {
        saveLocal(statesToLocal(positioned));
        return;
      }
      void plannerTextSetTodos(userId, positioned);
    },
    [userId],
  );

  const add = () => {
    const text = window.prompt("Quick exam to-do:");
    if (!text?.trim()) return;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `t-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ts = new Date().toISOString();
    save([
      ...todos,
      {
        id,
        text: text.trim(),
        priority: "high",
        done: false,
        position: todos.length,
        updatedAt: ts,
        createdAt: ts,
      },
    ]);
  };

  const cyclePriority = (tid: string) => {
    const order: Priority[] = ["high", "med", "low"];
    save(
      todos.map((t) => {
        if (t.id !== tid) return t;
        const i = order.indexOf(t.priority as Priority);
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
        <div className="h-32 animate-pulse rounded-2xl bg-kal-border/60" />
      </PlannerPageShell>
    );
  }

  return (
    <PlannerPageShell
      eyebrow="To-do list"
      title="Quick Exam To-Dos"
      subtitle={
        userId
          ? "Rank by urgency — synced when online. Separate from your main Plan tab."
          : "Rank by urgency. Sign in to sync across devices; until then saved on this device only."
      }
    >
      {todos.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-kal-border px-4 py-10 text-center text-sm text-kal-muted">
          No to-dos yet. Add rank-critical items — formula sheets, mock review,
          chapter deadlines.
        </p>
      ) : (
        <ul className="space-y-2">
          {todos.map((t) => (
            <li
              key={t.id}
              className={`flex items-start gap-3 rounded-xl border p-3 ${priorityStyle[t.priority as Priority]}`}
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
                className="mt-1 size-5 rounded border-kal-border bg-kal-input-bg text-kal-accent"
              />
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${t.done ? "text-kal-muted line-through" : "text-kal-text"}`}
                >
                  {t.text}
                </p>
                <button
                  type="button"
                  onClick={() => cyclePriority(t.id)}
                  className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-kal-muted hover:text-kal-accent"
                >
                  Priority: {t.priority}
                </button>
              </div>
              <button
                type="button"
                onClick={() => save(todos.filter((x) => x.id !== t.id))}
                className="rounded-lg p-2 text-kal-muted hover:bg-kal-accent-soft hover:text-orange-500"
                aria-label="Delete"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={add}
        className="kal-btn-accent flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold shadow-lg shadow-orange-900/20"
      >
        <Plus className="size-4" />
        Add to-do
      </button>
    </PlannerPageShell>
  );
}
