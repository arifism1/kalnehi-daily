"use client";

import { addDays, format, parseISO } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  startTransition,
} from "react";

import { PlannerPageShell } from "@/components/planner/PlannerPageShell";
import { fetchHabitsData } from "@/actions/habits";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import {
  enqueueHabitOutbox,
  getHabitBundleCached,
  mergeHabitBundleFromServer,
  saveHabitBundleCached,
  type HabitBundle,
  type HabitLogRow,
  type UserHabitRow,
} from "@/lib/habitLocal";
import { flushHabitOutbox } from "@/lib/habitSync";
import { useAuthStore } from "@/store/useAuthStore";

const LEGACY_STORAGE_KEY = "kalnehi-habits-v1";
const LEGACY_MIGRATED_KEY = "kalnehi-planner-habits-sync-migrated-v1";

type LegacyHabit = { id: string; label: string; streak: number };

function completionDatesForHabit(
  logs: HabitLogRow[],
  habitId: string,
): Set<string> {
  return new Set(
    logs.flatMap((l) => l.habit_id === habitId && l.completed ? [l.log_date] : []),
  );
}

/** Consecutive completed days ending today if today done, else ending yesterday. */
function habitStreak(
  logs: HabitLogRow[],
  habitId: string,
  today: string,
): number {
  const done = completionDatesForHabit(logs, habitId);
  let d = today;
  if (!done.has(d)) {
    d = format(addDays(parseISO(today), -1), "yyyy-MM-dd");
  }
  let n = 0;
  while (done.has(d)) {
    n++;
    d = format(addDays(parseISO(d), -1), "yyyy-MM-dd");
  }
  return n;
}

function isCompletedOn(
  logs: HabitLogRow[],
  habitId: string,
  ymd: string,
): boolean {
  const row = logs.find((l) => l.habit_id === habitId && l.log_date === ymd);
  return row?.completed === true;
}

function loadLegacyHabits(): LegacyHabit[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LegacyHabit[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function HabitsPlannerView() {
  const baseId = useId();
  const userId = useAuthStore((s) => s.user?.id);
  const today = useCalendarDate();
  const [bundle, setBundle] = useState<HabitBundle | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const refreshFromRemote = useCallback(async () => {
    if (!userId) return;
    const fresh = await fetchHabitsData();
    if (fresh.ok) {
      const cached = await getHabitBundleCached(userId);
      const merged = mergeHabitBundleFromServer(cached, {
        habits: fresh.habits,
        logs: fresh.logs,
      });
      await saveHabitBundleCached(merged);
      setBundle(merged);
    }
  }, [userId]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      startTransition(() => {
        void (async () => {
          if (!userId) {
            setHydrated(true);
            return;
          }
          try {
            const cached = await getHabitBundleCached(userId);
            if (cached) setBundle(cached);
            await refreshFromRemote();
            await flushHabitOutbox(userId);
            await refreshFromRemote();

            if (
              typeof window !== "undefined" &&
              localStorage.getItem(LEGACY_MIGRATED_KEY) !== "1"
            ) {
              const legacy = loadLegacyHabits();
              const after = await getHabitBundleCached(userId);
              const habitIds = new Set((after?.habits ?? []).map((h) => h.id));
              if (legacy.length > 0) {
                for (const h of legacy) {
                  if (habitIds.has(h.id)) continue;
                  // react-doctor-disable-next-line react-doctor/async-await-in-loop -- sequential outbox enqueue for legacy habit migration
                  await enqueueHabitOutbox(userId, {
                    kind: "habit_create",
                    id: h.id,
                    name: h.label.slice(0, 200),
                  });
                }
                await flushHabitOutbox(userId);
                await refreshFromRemote();
              }
              localStorage.setItem(LEGACY_MIGRATED_KEY, "1");
            }
          } finally {
            setHydrated(true);
          }
        })();
      });
    });
    return () => cancelAnimationFrame(id);
  }, [userId, refreshFromRemote]);

  useEffect(() => {
    if (!userId) return;
    const onHabits = () => {
      void getHabitBundleCached(userId).then((b) => {
        if (b) setBundle(b);
      });
    };
    window.addEventListener("kalnehi-habits-changed", onHabits);
    return () => window.removeEventListener("kalnehi-habits-changed", onHabits);
  }, [userId]);

  const habits = useMemo(() => bundle?.habits ?? [], [bundle?.habits]);
  const logs = useMemo(() => bundle?.logs ?? [], [bundle?.logs]);

  const bump = useCallback(
    async (habitId: string) => {
      if (!userId || isCompletedOn(logs, habitId, today)) return;

      const existingIdx = logs.findIndex(
        (l) => l.habit_id === habitId && l.log_date === today,
      );
      const nowIso = new Date().toISOString();
      let nextLogs: HabitLogRow[];
      let logId: string | undefined;
      if (existingIdx >= 0) {
        nextLogs = [...logs];
        const prev = nextLogs[existingIdx]!;
        logId = prev.id;
        nextLogs[existingIdx] = {
          ...prev,
          completed: true,
          updated_at: nowIso,
        };
      } else {
        logId = undefined;
        const row: HabitLogRow = {
          id: crypto.randomUUID(),
          user_id: userId,
          habit_id: habitId,
          log_date: today,
          completed: true,
          comment: null,
          created_at: nowIso,
          updated_at: nowIso,
        };
        nextLogs = [row, ...logs];
      }

      const nextBundle: HabitBundle = {
        habits,
        logs: nextLogs,
        updatedAt: Date.now(),
      };
      setBundle(nextBundle);
      await saveHabitBundleCached(nextBundle);
      await enqueueHabitOutbox(userId, {
        kind: "habit_log_upsert",
        habitId,
        logDate: today,
        completed: true,
        comment: null,
        logId,
      });
      void flushHabitOutbox(userId);
    },
    [userId, habits, logs, today],
  );

  const remove = useCallback(
    async (habitId: string) => {
      if (!userId) return;
      const nextHabits = habits.filter((h) => h.id !== habitId);
      const nextLogs = logs.filter((l) => l.habit_id !== habitId);
      const nextBundle: HabitBundle = {
        habits: nextHabits,
        logs: nextLogs,
        updatedAt: Date.now(),
      };
      setBundle(nextBundle);
      await saveHabitBundleCached(nextBundle);
      await enqueueHabitOutbox(userId, { kind: "habit_delete", id: habitId });
      void flushHabitOutbox(userId);
    },
    [userId, habits, logs],
  );

  const add = useCallback(async () => {
    const label = window.prompt("Habit label (exam-focused):");
    if (!label?.trim() || !userId) return;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `h-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const now = new Date().toISOString();
    const row: UserHabitRow = {
      id,
      user_id: userId,
      name: label.trim().slice(0, 200),
      created_at: now,
      updated_at: now,
    };
    const nextBundle: HabitBundle = {
      habits: [...habits, row],
      logs,
      updatedAt: Date.now(),
    };
    setBundle(nextBundle);
    await saveHabitBundleCached(nextBundle);
    await enqueueHabitOutbox(userId, {
      kind: "habit_create",
      id,
      name: row.name,
    });
    void flushHabitOutbox(userId);
  }, [userId, habits, logs]);

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

  if (!userId) {
    return (
      <PlannerPageShell
        eyebrow="Habit tracker"
        title="Daily PYQ & Weak Topic Discipline"
        subtitle="Sign in to sync habits with your account and the Habit Maker page."
      >
        <p className="text-sm text-kal-text-secondary">
          Planner habits are tied to your Kalnehi account so streaks stay in sync
          everywhere. Open the full{" "}
          <Link href="/habits" className="font-semibold text-kal-accent underline">
            Habit Maker
          </Link>{" "}
          after signing in.
        </p>
      </PlannerPageShell>
    );
  }

  return (
    <PlannerPageShell
      eyebrow="Habit tracker"
      title="Daily PYQ & Weak Topic Discipline"
      subtitle="Synced with your account — same habits as Habit Maker."
    >
      <ul className="space-y-3">
        {habits.map((h) => (
          <li
            key={h.id}
            className="kal-glass-panel flex items-start gap-3 rounded-2xl p-4 dark:border-white/12"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-kal-text">{h.name}</p>
              <p className="mt-1 text-xs text-kal-muted">
                Streak:{" "}
                <span className="font-semibold tabular-nums text-kal-accent">
                  {habitStreak(logs, h.id, today)}
                </span>{" "}
                days
                {isCompletedOn(logs, h.id, today) ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {" "}
                    · logged today
                  </span>
                ) : null}
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <button
                type="button"
                onClick={() => void bump(h.id)}
                disabled={isCompletedOn(logs, h.id, today)}
                className="kal-btn-accent rounded-xl px-3 py-2 text-xs font-semibold active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`Log ${h.name}`}
              >
                {isCompletedOn(logs, h.id, today) ? "Done today" : "+1 today"}
              </button>
              <button
                type="button"
                onClick={() => void remove(h.id)}
                className="rounded-xl p-2 text-kal-muted hover:bg-kal-danger-soft hover:text-kal-danger-text"
                aria-label="Remove habit"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      {habits.length === 0 ? (
        <p className="mb-3 text-sm text-kal-text-secondary">
          No habits yet. Add one below or manage them on{" "}
          <Link href="/habits" className="font-semibold text-kal-accent underline">
            Habit Maker
          </Link>
          .
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void add()}
        className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-dashed border-kal-accent/40 py-3 text-sm font-semibold text-kal-accent hover:bg-kal-accent-soft"
      >
        <Plus className="size-4" />
        Add exam habit
      </button>
      <p id={`${baseId}-hint`} className="text-[11px] text-kal-text-secondary">
        +1 records today on your calendar. Removes sync to your account.
      </p>
    </PlannerPageShell>
  );
}
