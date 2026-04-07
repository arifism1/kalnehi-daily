"use client";

import { addDays, format, parseISO } from "date-fns";
import { Check, Flame, Loader2, Plus } from "lucide-react";
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

function habitStreak(
  logs: HabitLogRow[],
  habitId: string,
  today: string,
): number {
  const done = new Set(
    logs
      .filter((l) => l.habit_id === habitId && l.completed)
      .map((l) => l.log_date),
  );
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

function last14DayDots(
  logs: HabitLogRow[],
  habitId: string,
  today: string,
): { date: string; done: boolean }[] {
  const done = new Set(
    logs
      .filter((l) => l.habit_id === habitId && l.completed)
      .map((l) => l.log_date),
  );
  const out: { date: string; done: boolean }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = format(addDays(parseISO(today), -i), "yyyy-MM-dd");
    out.push({ date: d, done: done.has(d) });
  }
  return out;
}

export function HabitMakerPage() {
  const userId = useAuthStore((s) => s.user?.id);
  const today = useCalendarDate();
  const [bundle, setBundle] = useState<HabitBundle | null>(null);
  const [hydrating, setHydrating] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

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

      const base: HabitBundle = bundle ?? {
        habits: [],
        logs: [],
        updatedAt: Date.now(),
      };
      const next: HabitBundle = {
        ...base,
        logs: upsertLogInList(base.logs, row),
        updatedAt: Date.now(),
      };
      setBundle(next);
      await saveHabitBundleCached(next);

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
        void refreshFromRemote();
      }
    },
    [userId, today, bundle, refreshFromRemote],
  );

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
          <ul className="flex flex-col gap-4">
            {habitCards.map((h) => {
              const streak = habitStreak(logs, h.id, today);
              const dots = last14DayDots(logs, h.id, today);
              return (
                <li
                  key={h.id}
                  className="rounded-2xl border border-kal-border bg-kal-card px-5 py-5 kal-shadow-card sm:px-7 sm:py-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-kal-border/80 pb-4">
                    <div>
                      <p className="text-base font-bold text-kal-text sm:text-lg">
                        {h.name}
                      </p>
                      <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-kal-accent">
                        <Flame className="h-4 w-4" strokeWidth={2.25} />
                        {streak > 0
                          ? `${streak} day streak 🔥`
                          : "Start your streak today"}
                      </p>
                    </div>
                    <span className="rounded-full border border-kal-border bg-kal-card-muted px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-kal-muted">
                      Last 14 days
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Last 14 days history">
                    {dots.map((d) => (
                      <span
                        key={d.date}
                        title={d.date}
                        className={`h-2.5 w-2.5 rounded-full ${
                          d.done
                            ? "bg-kal-accent"
                            : "bg-kal-border ring-1 ring-kal-border"
                        }`}
                      />
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

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
