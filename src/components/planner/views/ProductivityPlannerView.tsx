"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  startTransition,
} from "react";

import { PlannerPageShell } from "@/components/planner/PlannerPageShell";
import {
  hydrateUserPlannerTextFromServer,
  plannerTextSetProductivity,
} from "@/lib/userPlannerTextClient";
import { getUserPlannerTextBundleCached } from "@/lib/userPlannerTextLocal";
import { useAuthStore } from "@/store/useAuthStore";

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

function loadLocal(): State {
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

function saveLocal(next: State): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function ProductivityPlannerView() {
  const userId = useAuthStore((s) => s.user?.id);
  const [s, setS] = useState<State>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      startTransition(() => {
        void (async () => {
          if (!userId) {
            setS(loadLocal());
            setHydrated(true);
            return;
          }
          const bundle = await hydrateUserPlannerTextFromServer(userId);
          setS(bundle.productivity);
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
        if (b) setS(b.productivity);
      });
    };
    window.addEventListener("kalnehi-user-planner-text-changed", onPlanner);
    return () =>
      window.removeEventListener(
        "kalnehi-user-planner-text-changed",
        onPlanner,
      );
  }, [userId]);

  const persist = useCallback(
    (next: State) => {
      setS(next);
      if (!userId) {
        saveLocal(next);
        return;
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        void plannerTextSetProductivity(userId, next);
      }, 400);
    },
    [userId],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (!hydrated) {
    return (
      <PlannerPageShell
        eyebrow="Productivity planner"
        title="NEET / JEE Priority Tasks"
        subtitle="Loading…"
      >
        <div className="h-32 animate-pulse rounded-2xl bg-kal-border/60" />
      </PlannerPageShell>
    );
  }

  return (
    <PlannerPageShell
      eyebrow="Productivity planner"
      title="NEET / JEE Priority Tasks"
      subtitle={
        userId
          ? "Three rank-moving priorities and a scratchpad — synced when you are online, cached on this device."
          : "Three rank-moving priorities and a scratchpad. Sign in to sync across devices; until then this page saves on this device only."
      }
    >
      <div className="space-y-3">
        {(["p1", "p2", "p3"] as const).map((key, i) => (
          <label key={key} className="block">
            <span className="text-xs font-medium text-kal-muted">
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
              className="mt-1.5 min-h-[48px] w-full rounded-xl border border-kal-border bg-kal-card-muted px-3 py-2.5 text-base text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
            />
          </label>
        ))}
      </div>
      <label className="block">
        <span className="text-xs font-medium text-kal-muted">
          Focus notes & revision blocks
        </span>
        <textarea
          value={s.notes}
          onChange={(e) => persist({ ...s, notes: e.target.value })}
          rows={6}
          placeholder="High-yield topics for this week, mock analysis takeaways, coach assignments…"
          className="mt-1.5 w-full resize-y rounded-2xl border border-kal-border bg-kal-card-muted p-3 text-base sm:text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
        />
      </label>
    </PlannerPageShell>
  );
}
