"use client";

import { addDays, format, parseISO, startOfMonth } from "date-fns";
import clsx from "clsx";
import {
  BookOpen,
  Brain,
  Check,
  Droplets,
  Loader2,
  Moon,
  Plus,
  Sparkles,
  Sunrise,
} from "lucide-react";
import type { CSSProperties } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  createUserHabit,
  fetchHabitsData,
  upsertHabitLogEntry,
} from "@/actions/habits";
import { CircularProgressRing } from "@/components/ui/CircularProgressRing";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useHaptic } from "@/hooks/useHaptic";
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

function upsertLogInList(
  logs: HabitLogRow[],
  row: HabitLogRow,
): HabitLogRow[] {
  const i = logs.findIndex(
    (l) => l.habit_id === row.habit_id && l.log_date === row.log_date,
  );
  if (i >= 0) {
    const next = [...logs];
    next[i] = row;
    return next;
  }
  return [row, ...logs];
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

function completionDatesForHabit(
  logs: HabitLogRow[],
  habitId: string,
): Set<string> {
  return new Set(
    logs
      .filter((l) => l.habit_id === habitId && l.completed)
      .map((l) => l.log_date),
  );
}

function habitCreatedYmd(habit: UserHabitRow): string {
  return habit.created_at.slice(0, 10);
}

function totalCompletedDays(logs: HabitLogRow[], habitId: string): number {
  return logs.filter((l) => l.habit_id === habitId && l.completed).length;
}

/** Longest run of consecutive completed days within the calendar month of `today`. */
function bestStreakThisMonth(
  logs: HabitLogRow[],
  habitId: string,
  today: string,
): number {
  const done = completionDatesForHabit(logs, habitId);
  const ref = parseISO(today);
  const monthStart = startOfMonth(ref);
  let best = 0;

  for (let cur = new Date(monthStart); cur <= ref; cur = addDays(cur, 1)) {
    const ds = format(cur, "yyyy-MM-dd");
    if (!done.has(ds)) continue;
    let n = 0;
    let back = new Date(cur);
    while (
      back >= monthStart &&
      done.has(format(back, "yyyy-MM-dd"))
    ) {
      n++;
      back = addDays(back, -1);
    }
    best = Math.max(best, n);
  }
  return best;
}

type DotKind = "completed" | "missed" | "future" | "before";

function last14DayDots(
  logs: HabitLogRow[],
  habit: UserHabitRow,
  today: string,
): { date: string; kind: DotKind }[] {
  const done = completionDatesForHabit(logs, habit.id);
  const created = habitCreatedYmd(habit);
  const out: { date: string; kind: DotKind }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = format(addDays(parseISO(today), -i), "yyyy-MM-dd");
    if (d > today) {
      out.push({ date: d, kind: "future" });
    } else if (d < created) {
      out.push({ date: d, kind: "before" });
    } else if (done.has(d)) {
      out.push({ date: d, kind: "completed" });
    } else {
      out.push({ date: d, kind: "missed" });
    }
  }
  return out;
}

function isCompletedOn(
  logs: HabitLogRow[],
  habitId: string,
  ymd: string,
): boolean {
  const row = logs.find((l) => l.habit_id === habitId && l.log_date === ymd);
  return row?.completed === true;
}

function streakMotivationLine(
  streak: number,
  missedYesterday: boolean,
  todayDone: boolean,
): string {
  if (streak >= 14) return "Legendary consistency!";
  if (streak >= 7) return "You're on fire! Keep the momentum 🔥";
  if (streak >= 1)
    return "Every day counts — you're building something real.";
  if (missedYesterday && !todayDone) {
    return "A blip, not an identity — you've got this.";
  }
  return "Start your streak today.";
}

function dotVisualClass(kind: DotKind): string {
  switch (kind) {
    case "completed":
      return "bg-emerald-500 shadow-sm ring-1 ring-emerald-700/25";
    case "missed":
      return "bg-orange-300/95 ring-1 ring-orange-400/70 dark:bg-orange-900/50 dark:ring-orange-700/40";
    case "future":
      return "bg-kal-border/50 ring-1 ring-kal-border";
    case "before":
      return "bg-kal-card-muted ring-1 ring-kal-border/70";
  }
}

type HabitPreset = { name: string; Icon: typeof BookOpen };

const HABIT_PRESETS: HabitPreset[] = [
  { name: "Read for 25 minutes", Icon: BookOpen },
  { name: "Lights out by 11 PM", Icon: Moon },
  { name: "One focused practice block", Icon: Brain },
  { name: "Drink 8 glasses of water", Icon: Droplets },
  { name: "10-minute morning walk", Icon: Sunrise },
  { name: "Review today's mistakes", Icon: Sparkles },
];

function ConfettiCelebration({
  burstKey,
}: {
  burstKey: number;
}) {
  const particles = useMemo(() => {
    return Array.from({ length: 22 }, (_, i) => {
      const angle = (i / 22) * Math.PI * 2 + (i % 5) * 0.08;
      const dist = 36 + (i % 7) * 8;
      const dx = `${Math.cos(angle) * dist}px`;
      const dy = `${Math.sin(angle) * dist - 12}px`;
      const dr = `${180 + (i % 5) * 40}deg`;
      const colors = [
        "bg-orange-400",
        "bg-amber-400",
        "bg-emerald-400",
        "bg-sky-400",
        "bg-violet-400",
      ];
      return { dx, dy, dr, color: colors[i % colors.length], delay: i * 14 };
    });
  }, [burstKey]);

  if (!burstKey) return null;

  return (
    <div
      className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-0 w-0 overflow-visible"
      aria-hidden
    >
      {particles.map((p, i) => (
        <span
          key={`${burstKey}-${i}`}
          style={
            {
              "--dx": p.dx,
              "--dy": p.dy,
              "--dr": p.dr,
              animationDelay: `${p.delay}ms`,
            } as CSSProperties
          }
          className={clsx(
            "absolute h-2 w-1.5 rounded-[2px] motion-safe:animate-[confetti-burst_0.78s_ease-out_forwards] motion-reduce:hidden",
            p.color,
          )}
        />
      ))}
    </div>
  );
}

export function HabitMakerPage() {
  const { limited: habitsLimited } = useFeatureAccess("habits");
  const userId = useAuthStore((s) => s.user?.id);
  const haptic = useHaptic();
  const today = useCalendarDate();
  const [bundle, setBundle] = useState<HabitBundle | null>(null);
  const [hydrating, setHydrating] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [rowEnterId, setRowEnterId] = useState<string | null>(null);
  const rowEnterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [celebrateByHabit, setCelebrateByHabit] = useState<
    Record<string, number>
  >({});
  const [streakPopHabitId, setStreakPopHabitId] = useState<string | null>(null);
  const streakPopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commentTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

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
    if (!userId) {
      setHydrating(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setHydrating(true);
      try {
        const cached = await getHabitBundleCached(userId);
        if (!cancelled && cached) setBundle(cached);
        await refreshFromRemote();
        await flushHabitOutbox(userId);
        await refreshFromRemote();
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, refreshFromRemote]);

  const habits = bundle?.habits ?? [];
  const logs = bundle?.logs ?? [];

  const yesterday = useMemo(
    () => format(addDays(parseISO(today), -1), "yyyy-MM-dd"),
    [today],
  );

  const todayLog = useCallback(
    (habitId: string): HabitLogRow | undefined =>
      logs.find((l) => l.habit_id === habitId && l.log_date === today),
    [logs, today],
  );

  const persistLog = useCallback(
    async (
      habitId: string,
      completed: boolean,
      comment: string | null,
      previousRow?: HabitLogRow | null,
      opts?: { skipRemoteRefresh?: boolean },
    ) => {
      if (!userId) return;
      const now = new Date().toISOString();
      const row: HabitLogRow = {
        id: previousRow?.id ?? crypto.randomUUID(),
        user_id: userId,
        habit_id: habitId,
        log_date: today,
        completed,
        comment:
          comment == null ? null : comment.trim().slice(0, 1_000) || null,
        created_at: previousRow?.created_at ?? now,
        updated_at: now,
      };

      setBundle((prev) => {
        const base: HabitBundle = prev ?? {
          habits,
          logs,
          updatedAt: Date.now(),
        };
        const next: HabitBundle = {
          ...base,
          logs: upsertLogInList(base.logs, row),
          updatedAt: Date.now(),
        };
        void saveHabitBundleCached(next);
        return next;
      });

      const res = await upsertHabitLogEntry({
        id: row.id,
        habitId,
        logDate: today,
        completed,
        comment: row.comment,
      });
      if (!res.ok) {
        await enqueueHabitOutbox(userId, {
          kind: "habit_log_upsert",
          habitId,
          logDate: today,
          completed,
          comment: row.comment,
          logId: row.id,
        });
        setNotice("Saved on this device — habits will sync when you're online.");
      } else {
        setNotice(null);
        if (!opts?.skipRemoteRefresh) void refreshFromRemote();
      }
    },
    [userId, today, habits, logs, refreshFromRemote],
  );

  const recoveryHabitIds = useMemo(() => {
    return habits
      .filter((h) => {
        if (habitCreatedYmd(h) > yesterday) return false;
        if (isCompletedOn(logs, h.id, today)) return false;
        if (isCompletedOn(logs, h.id, yesterday)) return false;
        return true;
      })
      .map((h) => h.id);
  }, [habits, logs, today, yesterday]);

  const showRecoveryBanner = recoveryHabitIds.length > 0;

  const startNewStreakToday = useCallback(async () => {
    if (!userId || recoveryBusy || recoveryHabitIds.length === 0) return;
    setRecoveryBusy(true);
    setNotice(null);
    try {
      for (const habitId of recoveryHabitIds) {
        const cached = await getHabitBundleCached(userId);
        const runLogs = cached?.logs ?? logs;
        const tl = runLogs.find(
          (l) => l.habit_id === habitId && l.log_date === today,
        );
        await persistLog(habitId, true, tl?.comment ?? null, tl ?? null, {
          skipRemoteRefresh: true,
        });
      }
      void refreshFromRemote();
    } finally {
      setRecoveryBusy(false);
    }
  }, [userId, recoveryBusy, recoveryHabitIds, logs, today, persistLog]);

  const scheduleCommentSave = useCallback(
    (habitId: string, text: string) => {
      if (!userId) return;
      const key = habitId;
      const prev = commentTimers.current.get(key);
      if (prev) clearTimeout(prev);
      const t = setTimeout(() => {
        void (async () => {
          const cached = await getHabitBundleCached(userId);
          const existing = cached?.logs.find(
            (l) => l.habit_id === habitId && l.log_date === today,
          );
          const done = existing?.completed ?? false;
          void persistLog(habitId, done, text.trim() || null, existing ?? null);
        })();
      }, 500);
      commentTimers.current.set(key, t);
    },
    [persistLog, today, userId],
  );

  useEffect(() => {
    return () => {
      commentTimers.current.forEach((t) => clearTimeout(t));
      if (rowEnterTimer.current) clearTimeout(rowEnterTimer.current);
      if (streakPopTimer.current) clearTimeout(streakPopTimer.current);
    };
  }, []);

  const scheduleRowEnterAnimation = useCallback((habitId: string) => {
    if (rowEnterTimer.current) clearTimeout(rowEnterTimer.current);
    setRowEnterId(habitId);
    rowEnterTimer.current = setTimeout(() => {
      setRowEnterId(null);
      rowEnterTimer.current = null;
    }, 650);
  }, []);

  const commitNewHabit = useCallback(
    async (rawName: string) => {
      if (!userId || adding) return;
      const name = rawName.trim().slice(0, 200);
      if (!name) return;
      setAdding(true);
      setNotice(null);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const row: UserHabitRow = {
        id,
        user_id: userId,
        name,
        created_at: now,
        updated_at: now,
      };
      const base = bundle ?? {
        habits: [],
        logs: [],
        updatedAt: Date.now(),
      };
      const next: HabitBundle = {
        ...base,
        habits: [...base.habits, row],
        updatedAt: Date.now(),
      };
      setBundle(next);
      await saveHabitBundleCached(next);
      scheduleRowEnterAnimation(id);

      const res = await createUserHabit({ id, name });
      if (!res.ok) {
        await enqueueHabitOutbox(userId, { kind: "habit_create", id, name });
        setNotice("Habit saved on this device — will sync when online.");
      } else {
        void refreshFromRemote();
      }
      setAdding(false);
    },
    [userId, adding, bundle, refreshFromRemote, scheduleRowEnterAnimation],
  );

  const addHabitFromInput = useCallback(async () => {
    const name = newName.trim();
    if (!name) return;
    await commitNewHabit(name);
    setNewName("");
  }, [commitNewHabit, newName]);

  const addPresetHabit = useCallback(
    async (name: string) => {
      await commitNewHabit(name);
    },
    [commitNewHabit],
  );

  const habitNameTaken = useCallback(
    (label: string) =>
      habits.some(
        (h) => h.name.trim().toLowerCase() === label.trim().toLowerCase(),
      ),
    [habits],
  );

  const doneTodayCount = useMemo(() => {
    return habits.filter((h) => isCompletedOn(logs, h.id, today)).length;
  }, [habits, logs, today]);

  const dailyProgressPercent =
    habits.length === 0 ? 0 : (doneTodayCount / habits.length) * 100;

  const onToggleCheckIn = useCallback(
    (habitId: string, checked: boolean, tl: HabitLogRow | undefined) => {
      const willComplete = !checked;
      void persistLog(habitId, !checked, tl?.comment ?? null, tl);
      if (willComplete) {
        haptic("success");
        setCelebrateByHabit((prev) => ({
          ...prev,
          [habitId]: (prev[habitId] ?? 0) + 1,
        }));
        if (streakPopTimer.current) clearTimeout(streakPopTimer.current);
        setStreakPopHabitId(habitId);
        streakPopTimer.current = setTimeout(() => {
          setStreakPopHabitId(null);
          streakPopTimer.current = null;
        }, 650);
      }
    },
    [persistLog, haptic],
  );

  if (!userId) {
    return (
      <div className="kal-glass-panel rounded-2xl p-8 text-center text-kal-muted">
        Sign in to use Habit Maker.
      </div>
    );
  }

  if (hydrating && !bundle) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-kal-muted">
        <Loader2 className="h-10 w-10 animate-spin text-kal-accent" />
        <p className="text-sm font-medium">Loading habits…</p>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-3xl pb-16">
      <div
        className="pointer-events-none absolute -left-16 top-10 h-48 w-48 rounded-full bg-kal-accent/10 blur-3xl motion-safe:animate-pulse"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-10 bottom-40 h-40 w-40 rounded-full bg-kal-accent-soft/40 blur-3xl"
        aria-hidden
      />

      <header className="relative mb-10">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-kal-accent">
          Discipline
        </p>
        <h1 className="kal-feature-title mt-2">Habit Maker</h1>
        <p className="kal-feature-lead mt-3 max-w-xl">
          Small wins, stacked daily — make consistency feel as good as the
          results.
        </p>
      </header>

      {notice ? (
        <p className="mb-6 rounded-xl border border-kal-accent/20 bg-kal-accent-soft/50 px-4 py-3 text-sm text-kal-text-secondary motion-safe:animate-[habit-row-enter_0.45s_ease-out_both]">
          {notice}
        </p>
      ) : null}

      <section className="kal-glass-panel mb-8 rounded-2xl px-5 py-6 sm:px-8 sm:py-7">
        <h2 className="text-sm font-bold text-kal-text">Add new habit</h2>
        <p className="mt-1 text-xs text-kal-text-secondary sm:text-sm">
          Name what you&apos;ll repeat every day — keep it concrete.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void addHabitFromInput();
            }}
            placeholder="e.g. Study 4 hours, No phone after 10 PM…"
            className="min-h-[48px] w-full flex-1 rounded-xl border border-kal-border bg-kal-page px-4 text-base sm:text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent/45 focus:outline-none focus:ring-2 focus:ring-kal-accent/15"
            maxLength={200}
          />
          <button
            type="button"
            disabled={adding || !newName.trim()}
            onClick={() => void addHabitFromInput()}
            className="kal-btn-accent min-h-[48px] shrink-0 rounded-xl px-5 py-3 text-xs uppercase tracking-wide enabled:motion-safe:active:scale-[0.98] disabled:opacity-45 motion-reduce:enabled:active:scale-100"
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            )}
            Add habit
          </button>
        </div>
      </section>

      {habits.length === 0 ? (
        <section className="kal-glass-panel mb-10 overflow-hidden rounded-3xl border border-dashed border-kal-border/70 bg-gradient-to-br from-kal-accent-soft/50 via-kal-card/90 to-kal-card/95 px-6 py-10 text-center sm:px-10 sm:py-12">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-kal-accent-soft to-amber-50/90 shadow-inner ring-1 ring-kal-accent/20">
            <div className="relative">
              <Sparkles
                className="h-11 w-11 text-kal-accent"
                strokeWidth={1.75}
              />
              <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-kal-accent text-[11px] font-bold text-kal-accent-foreground shadow-md">
                ✓
              </span>
            </div>
          </div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-kal-accent">
            Your streak starts here
          </p>
          <h2 className="kal-section-heading mt-2">
            Let&apos;s build some unbreakable habits 🔥
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-kal-muted">
            Pick a starter below or name your own — every rep counts.
          </p>
          <ul className="mx-auto mt-8 grid max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
            {HABIT_PRESETS.map(({ name, Icon }) => {
              const taken = habitNameTaken(name);
              return (
                <li key={name}>
                  <button
                    type="button"
                    disabled={adding || taken}
                    onClick={() => void addPresetHabit(name)}
                    className={clsx(
                      "kal-glass-subtle group flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm font-semibold text-kal-text shadow-sm transition-all",
                      taken
                        ? "cursor-not-allowed border-kal-border/60 opacity-50"
                        : "border-kal-border hover:border-kal-accent/35 hover:shadow-md motion-safe:hover:-translate-y-0.5",
                    )}
                  >
                    <span
                      className={clsx(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors",
                        taken
                          ? "border-kal-border bg-kal-card-muted text-kal-muted"
                          : "border-kal-accent/20 bg-kal-accent-soft/50 text-kal-accent group-hover:border-kal-accent/40 group-hover:bg-kal-accent-soft",
                      )}
                    >
                      <Icon className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <span className="min-w-0 leading-snug">{name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {habits.length > 0 ? (
        <section className="kal-glass-panel relative mb-10 overflow-hidden rounded-3xl bg-gradient-to-br from-kal-card/95 via-white/60 to-kal-accent-soft/30 px-5 py-8 sm:px-10 sm:py-10">
          <div
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-kal-accent/5 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col items-center gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
              <CircularProgressRing
                percent={dailyProgressPercent}
                gradientId="kal-habit-daily-ring"
                size={168}
                strokeWidth={10}
                progressClassName="motion-safe:transition-[stroke-dasharray] motion-safe:duration-[780ms] motion-safe:ease-out motion-reduce:transition-none"
                trackClassName="text-slate-200/95 dark:text-slate-600"
                className="drop-shadow-sm"
              >
                <p className="text-3xl font-extrabold tabular-nums leading-none text-kal-text">
                  {doneTodayCount}
                  <span className="text-lg font-bold text-kal-muted">
                    /{habits.length}
                  </span>
                </p>
                <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-kal-muted">
                  done today
                </p>
              </CircularProgressRing>
              <div className="max-w-sm text-center sm:text-left">
                <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-kal-accent">
                  Today&apos;s check-in
                </h2>
                <p className="mt-2 text-lg font-bold tracking-tight text-kal-text sm:text-xl">
                  {doneTodayCount === habits.length
                    ? "You showed up for all of them."
                    : doneTodayCount > 0
                      ? "Momentum is building — keep going."
                      : "Your canvas is clear — paint the first check."}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-kal-muted">
                  For{" "}
                  <span className="font-semibold tabular-nums text-kal-text">
                    {today}
                  </span>{" "}
                  — tap when you&apos;ve earned it. Notes autosave quietly.
                </p>
              </div>
            </div>
          </div>

          <ul className="relative mt-10 flex flex-col gap-4">
            {habits.map((h) => {
              const tl = todayLog(h.id);
              const checked = tl?.completed ?? false;
              const commentVal = tl?.comment ?? "";
              const streak = habitStreak(logs, h.id, today);
              const burstKey = celebrateByHabit[h.id] ?? 0;
              return (
                <li
                  key={`check-${h.id}`}
                  className="kal-glass-subtle group/check relative overflow-hidden rounded-2xl px-5 py-6 shadow-sm transition-[box-shadow,transform,border-color] motion-safe:duration-300 motion-safe:ease-out hover:border-kal-accent/30 hover:shadow-[0_12px_40px_-12px_rgba(255,122,0,0.18)] motion-safe:hover:-translate-y-0.5 sm:px-8 sm:py-7"
                >
                  {burstKey ? (
                    <ConfettiCelebration burstKey={burstKey} />
                  ) : null}
                  <div className="relative z-[1] flex flex-wrap items-start justify-between gap-3">
                    <p className="text-sm font-bold text-kal-text sm:text-base">
                      {h.name}
                    </p>
                    {!habitsLimited ? (
                      <div className="flex items-center gap-2">
                        <span
                          className={clsx(
                            "inline-flex items-center gap-1 rounded-full bg-kal-card-muted px-2.5 py-1 text-[11px] font-bold tabular-nums text-kal-text ring-1 ring-kal-border/70",
                            streakPopHabitId === h.id &&
                              "motion-safe:animate-[streak-pop_0.55s_ease-out_both] motion-reduce:animate-none",
                          )}
                        >
                          <span aria-hidden>🔥</span>
                          {streak} day streak
                        </span>
                      </div>
                    ) : (
                      <span className="rounded-full bg-kal-card-muted px-2.5 py-1 text-[10px] font-semibold text-kal-muted">
                        Streaks in Pro
                      </span>
                    )}
                  </div>
                  <div className="relative z-[1] mt-5 flex items-start gap-4">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      aria-label={`Did you complete ${h.name} today?`}
                      onClick={() => onToggleCheckIn(h.id, checked, tl)}
                      className={clsx(
                        "relative mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 transition-[transform,box-shadow,background-color,border-color] motion-safe:duration-200",
                        checked
                          ? "border-kal-accent bg-kal-accent text-kal-accent-foreground shadow-[0_0_0_4px_rgba(239,68,68,0.12)] motion-safe:animate-[completion-pop_0.55s_ease-out_both] motion-reduce:animate-none"
                          : "border-kal-border bg-kal-page text-transparent shadow-sm hover:border-kal-accent/45 hover:shadow-md motion-safe:hover:scale-[1.03]",
                      )}
                    >
                      <Check className="h-6 w-6" strokeWidth={3} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <span className="text-base font-semibold text-kal-text">
                        Did it today?
                      </span>
                      <p className="mt-1 text-xs text-kal-muted">
                        {checked
                          ? "Beautiful — that’s one more rep for future you."
                          : "Tap when you’ve completed this habit today."}
                      </p>
                    </div>
                  </div>
                  <div className="relative z-[1] mt-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-kal-muted">
                      Optional note
                    </span>
                    <textarea
                      value={commentVal}
                      onChange={(e) => {
                        const v = e.target.value;
                        setBundle((prev) => {
                          const base = prev ?? {
                            habits,
                            logs,
                            updatedAt: Date.now(),
                          };
                          const now = new Date().toISOString();
                          const prevLog = base.logs.find(
                            (l) =>
                              l.habit_id === h.id && l.log_date === today,
                          );
                          const row: HabitLogRow = {
                            id: prevLog?.id ?? crypto.randomUUID(),
                            user_id: userId,
                            habit_id: h.id,
                            log_date: today,
                            completed: checked,
                            comment: v.trim().slice(0, 1_000) || null,
                            created_at: prevLog?.created_at ?? now,
                            updated_at: now,
                          };
                          const next: HabitBundle = {
                            ...base,
                            logs: upsertLogInList(base.logs, row),
                            updatedAt: Date.now(),
                          };
                          void saveHabitBundleCached(next);
                          scheduleCommentSave(h.id, v);
                          return next;
                        });
                      }}
                      rows={2}
                      placeholder="How did it feel? Anything to remember?"
                      className="mt-1.5 w-full resize-y rounded-xl border border-kal-border bg-kal-page px-3 py-2.5 text-base sm:text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/15"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {habits.length > 0 && showRecoveryBanner ? (
        <div className="mb-10 overflow-hidden rounded-2xl border border-orange-200/80 bg-gradient-to-br from-orange-50/95 via-white/60 to-white/75 px-6 py-7 shadow-lg backdrop-blur-md motion-safe:animate-[habit-row-enter_0.6s_ease-out_both] dark:border-orange-900/45 dark:from-orange-950/45 dark:via-zinc-900/75 dark:to-zinc-900/88 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-200">
                <Sparkles className="h-6 w-6" strokeWidth={2} />
              </span>
              <div>
                <p className="text-sm font-bold text-kal-text sm:text-base">
                  Recovery mode
                </p>
                <p className="mt-1 max-w-md text-sm leading-relaxed text-kal-text-secondary">
                  One day doesn&apos;t break you. Start fresh today and rebuild
                  your streak!
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={recoveryBusy}
              onClick={() => void startNewStreakToday()}
              className="kal-btn-accent min-h-[52px] w-full shrink-0 rounded-xl px-6 py-3.5 text-sm enabled:motion-safe:active:scale-[0.99] disabled:opacity-50 sm:w-auto sm:min-w-[14rem] motion-reduce:enabled:active:scale-100"
            >
              {recoveryBusy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Start New Streak Today"
              )}
            </button>
          </div>
        </div>
      ) : null}

      {habits.length > 0 ? (
        <section className="mb-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-kal-muted">
            My habits
          </h2>
          <ul className="flex flex-col gap-6">
            {habits.map((h) => {
              const streak = habitStreak(logs, h.id, today);
              const bestMonth = bestStreakThisMonth(logs, h.id, today);
              const totalDone = totalCompletedDays(logs, h.id);
              const dots = last14DayDots(logs, h, today);
              const missedYesterday = !isCompletedOn(logs, h.id, yesterday);
              const todayDone = isCompletedOn(logs, h.id, today);
              const motivation = streakMotivationLine(
                streak,
                missedYesterday,
                todayDone,
              );
              const showFire = streak >= 7;
              const enterMotion =
                rowEnterId === h.id
                  ? "motion-safe:animate-[habit-row-enter_0.55s_ease-out_both] motion-reduce:animate-none"
                  : "";
              return (
                <li
                  key={h.id}
                  className={clsx(
                    "kal-glass-panel rounded-2xl px-6 py-7 transition-[transform,box-shadow] motion-safe:duration-300 motion-safe:ease-out sm:px-8 sm:py-8",
                    "hover:border-kal-accent/25 hover:shadow-[0_16px_48px_-16px_rgba(15,23,42,0.12)] motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-lg",
                    enterMotion,
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-kal-border/80 pb-6">
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-bold tracking-tight text-kal-text sm:text-xl">
                        {h.name}
                      </p>
                      <p className="mt-3 text-sm font-medium leading-snug text-kal-text-secondary">
                        {motivation}
                      </p>
                    </div>
                    {habitsLimited ? (
                      <span className="shrink-0 rounded-full bg-kal-card-muted px-3 py-1 text-[10px] font-semibold text-kal-muted">
                        Streaks in Pro
                      </span>
                    ) : (
                      <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-kal-muted">
                          Current streak
                        </p>
                        <p
                          className={clsx(
                            "flex items-center gap-1.5 text-2xl font-extrabold tabular-nums text-kal-text sm:text-3xl",
                            streakPopHabitId === h.id &&
                              "motion-safe:animate-[streak-pop_0.55s_ease-out_both] motion-reduce:animate-none",
                          )}
                        >
                          {streak}
                          {showFire ? (
                            <span className="text-2xl leading-none" aria-hidden>
                              🔥
                            </span>
                          ) : null}
                        </p>
                      </div>
                    )}
                  </div>

                  {!habitsLimited && (
                    <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6">
                      <div className="rounded-xl border border-kal-border/80 bg-kal-page/80 px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-kal-muted">
                          Best this month
                        </p>
                        <p className="mt-1 text-xl font-bold tabular-nums text-kal-text">
                          {bestMonth}{" "}
                          <span className="text-sm font-semibold text-kal-muted">
                            days
                          </span>
                        </p>
                      </div>
                      <div className="rounded-xl border border-kal-border/80 bg-kal-page/80 px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-kal-muted">
                          Total completed
                        </p>
                        <p className="mt-1 text-xl font-bold tabular-nums text-kal-text">
                          {totalDone}{" "}
                          <span className="text-sm font-semibold text-kal-muted">
                            lifetime
                          </span>
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mt-6">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-kal-muted">
                        Last 14 days
                      </p>
                      <p className="max-w-[16rem] text-[10px] leading-relaxed text-kal-muted sm:max-w-none">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />{" "}
                          Done
                        </span>
                        <span className="mx-1.5 text-kal-border sm:mx-2">·</span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-orange-300" />{" "}
                          Missed
                        </span>
                        <span className="mx-1.5 text-kal-border sm:mx-2">·</span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-kal-border/60" />{" "}
                          Future
                        </span>
                        <span className="mx-1.5 text-kal-border sm:mx-2">·</span>
                        <span className="inline-flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-kal-card-muted ring-1 ring-kal-border/70" />{" "}
                          Before
                        </span>
                      </p>
                    </div>
                    <div
                      className="flex flex-wrap gap-2"
                      aria-label="14 day habit history"
                    >
                      {dots.map((d) => (
                        <span
                          key={d.date}
                          title={d.date}
                          className={`h-3 w-3 shrink-0 rounded-full ${dotVisualClass(d.kind)}`}
                        />
                      ))}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
