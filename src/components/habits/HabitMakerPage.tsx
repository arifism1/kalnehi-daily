"use client";

import { addDays, format, parseISO, startOfMonth } from "date-fns";
import { Check, Loader2, Plus, Sparkles } from "lucide-react";
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
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
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

function totalCompletedDays(
  logs: HabitLogRow[],
  habitId: string,
): number {
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

export function HabitMakerPage() {
  const { limited: habitsLimited } = useFeatureAccess("habits");
  const userId = useAuthStore((s) => s.user?.id);
  const today = useCalendarDate();
  const [bundle, setBundle] = useState<HabitBundle | null>(null);
  const [hydrating, setHydrating] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [recoveryBusy, setRecoveryBusy] = useState(false);

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
    };
  }, []);

  const addHabit = useCallback(async () => {
    if (!userId || adding) return;
    const name = newName.trim().slice(0, 200);
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
    setNewName("");

    const res = await createUserHabit({ id, name });
    if (!res.ok) {
      await enqueueHabitOutbox(userId, { kind: "habit_create", id, name });
      setNotice("Habit saved on this device — will sync when online.");
    } else {
      void refreshFromRemote();
    }
    setAdding(false);
  }, [userId, newName, adding, bundle, refreshFromRemote]);

  const habitCards = useMemo(() => habits, [habits]);

  if (!userId) {
    return (
      <div className="rounded-2xl border border-kal-border bg-kal-card p-8 text-center text-kal-muted">
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
        className="pointer-events-none absolute -left-16 top-10 h-48 w-48 rounded-full bg-kal-accent/10 blur-3xl"
        aria-hidden
      />

      <header className="relative mb-10">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-kal-accent">
          Discipline
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-kal-text sm:text-4xl">
          Habit Maker
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-kal-muted sm:text-base">
          Build unbreakable daily discipline
        </p>
      </header>

      {notice ? (
        <p className="mb-6 rounded-xl border border-kal-accent/20 bg-kal-accent-soft/50 px-4 py-3 text-sm text-kal-text-secondary">
          {notice}
        </p>
      ) : null}

      <section className="mb-10 rounded-2xl border border-kal-border bg-kal-card px-5 py-6 kal-shadow-card sm:px-8 sm:py-7">
        <h2 className="text-sm font-bold text-kal-text">Add new habit</h2>
        <p className="mt-1 text-xs text-kal-text-secondary sm:text-sm">
          Name what you&apos;ll repeat every day — keep it concrete.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Study 4 hours, No phone after 10 PM…"
            className="min-h-[48px] w-full flex-1 rounded-xl border border-kal-border bg-kal-page px-4 text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent/45 focus:outline-none focus:ring-2 focus:ring-kal-accent/15"
            maxLength={200}
          />
          <button
            type="button"
            disabled={adding || !newName.trim()}
            onClick={() => void addHabit()}
            className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-xl bg-kal-accent px-5 py-3 text-xs font-bold uppercase tracking-wide text-kal-accent-foreground shadow-sm transition-colors hover:bg-kal-accent-hover disabled:opacity-45"
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

      <section className="mb-10">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-kal-muted">
          My habits
        </h2>
        {habitCards.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-kal-border bg-kal-card-muted/50 px-6 py-12 text-center text-sm text-kal-muted">
            No habits yet — add your first one above.
          </p>
        ) : (
          <ul className="flex flex-col gap-6">
            {habitCards.map((h) => {
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
              return (
                <li
                  key={h.id}
                  className="rounded-2xl border border-kal-border bg-kal-card px-6 py-7 kal-shadow-card sm:px-8 sm:py-8"
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
                        <p className="flex items-center gap-1.5 text-3xl font-extrabold tabular-nums text-kal-text sm:text-4xl">
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
        )}
      </section>

      {habitCards.length > 0 && showRecoveryBanner ? (
        <div className="mb-10 overflow-hidden rounded-2xl border border-orange-200/90 bg-gradient-to-br from-orange-50 via-kal-card to-kal-card px-6 py-7 kal-shadow-card dark:border-orange-900/40 dark:from-orange-950/35 dark:via-kal-card dark:to-kal-card sm:px-8 sm:py-8">
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
              className="inline-flex min-h-[52px] w-full shrink-0 items-center justify-center rounded-xl bg-kal-accent px-6 py-3.5 text-sm font-bold text-kal-accent-foreground shadow-sm transition-colors hover:bg-kal-accent-hover disabled:opacity-50 sm:w-auto sm:min-w-[14rem]"
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

      <section>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-kal-muted">
          Today&apos;s check-in
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-kal-text-secondary">
          For{" "}
          <span className="font-semibold tabular-nums text-kal-text">{today}</span>{" "}
          — tap when you&apos;ve earned it. Notes autosave quietly.
        </p>
        {habitCards.length === 0 ? null : (
          <ul className="flex flex-col gap-5">
            {habitCards.map((h) => {
              const tl = todayLog(h.id);
              const checked = tl?.completed ?? false;
              const commentVal = tl?.comment ?? "";
              return (
                <li
                  key={`check-${h.id}`}
                  className="rounded-2xl border border-kal-border bg-kal-card px-5 py-6 kal-shadow-card sm:px-8 sm:py-7"
                >
                  <p className="text-sm font-bold text-kal-text">{h.name}</p>
                  <div className="mt-5 flex items-start gap-4">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      aria-label={`Did you complete ${h.name} today?`}
                      onClick={() =>
                        void persistLog(h.id, !checked, tl?.comment ?? null, tl)
                      }
                      className={`mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 transition-colors ${
                        checked
                          ? "border-kal-accent bg-kal-accent text-kal-accent-foreground"
                          : "border-kal-border bg-kal-page text-transparent hover:border-kal-accent/45"
                      }`}
                    >
                      <Check className="h-6 w-6" strokeWidth={3} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <span className="text-base font-semibold text-kal-text">
                        Did it today?
                      </span>
                      <p className="mt-1 text-xs text-kal-muted">
                        {checked
                          ? "Nice — that’s one more rep for future you."
                          : "Tap when you’ve completed this habit today."}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
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
                      className="mt-1.5 w-full resize-y rounded-xl border border-kal-border bg-kal-page px-3 py-2.5 text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/15"
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
