"use client";

import clsx from "clsx";
import { AlarmClock, Pencil, Plus, Trash2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";

import { getIstCalendarDateString } from "@/lib/customReminders/istClock";
import { SettingsSheetSwitch } from "@/components/settings/SettingsSheetSwitch";
import { useNotificationsToast } from "@/components/settings/notificationsToastContext";
import { useAuthStore } from "@/store/useAuthStore";
import { surfaceOptionalString } from "@/lib/userFacingErrors";

type RepeatType = "daily" | "once";

export type CustomReminderRow = {
  id: string;
  title: string;
  body: string;
  scheduled_time: string;
  repeat_type: RepeatType;
  is_active: boolean;
  run_once_on_ist_date: string | null;
  last_fired_ist_date: string | null;
  created_at: string;
  updated_at: string;
};

function dbTimeToInputValue(t: string): string {
  const s = t.trim();
  if (/^\d{2}:\d{2}$/.test(s)) return s;
  if (/^\d{2}:\d{2}:\d{2}/.test(s)) return s.slice(0, 5);
  return "09:00";
}

const EXAMPLES: { title: string; body: string; time: string }[] = [
  { title: "Study Biology now", body: "Open your plan and start the next Biology block.", time: "09:00" },
  { title: "Take a break", body: "Step away, hydrate, and reset before the next sprint.", time: "14:00" },
  { title: "Revise Chapter X", body: "Quick active recall on today's weak chapter.", time: "19:30" },
];

export function CustomRemindersSettings({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const baseId = useId();
  const user = useAuthStore((s) => s.user);
  const showToast = useNotificationsToast();
  const [reminders, setReminders] = useState<CustomReminderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [time, setTime] = useState("09:00");
  const [repeat, setRepeat] = useState<RepeatType>("daily");
  const [runOnceDate, setRunOnceDate] = useState("");

  const istToday = useMemo(() => getIstCalendarDateString(), []);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch("/api/user/custom-reminders", { credentials: "include" });
      const data = (await res.json()) as { reminders?: CustomReminderRow[]; error?: string };
      if (res.ok) {
        setReminders(data.reminders ?? []);
      } else {
        setMessage(
          surfaceOptionalString(data.error, "Could not load reminders."),
        );
      }
    } catch {
      setMessage("Could not load reminders.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = useCallback(() => {
    setTitle("");
    setBody("");
    setTime("09:00");
    setRepeat("daily");
    setRunOnceDate(istToday);
    setEditingId(null);
  }, [istToday]);

  const openNew = useCallback(() => {
    setMessage(null);
    resetForm();
    setRunOnceDate(istToday);
    setFormOpen(true);
    setEditingId(null);
  }, [istToday, resetForm]);

  const startEdit = useCallback(
    (r: CustomReminderRow) => {
      setMessage(null);
      setEditingId(r.id);
      setTitle(r.title);
      setBody(r.body);
      setTime(dbTimeToInputValue(r.scheduled_time));
      setRepeat(r.repeat_type);
      setRunOnceDate(r.run_once_on_ist_date?.slice(0, 10) ?? istToday);
      setFormOpen(true);
    },
    [istToday],
  );

  const submitForm = useCallback(async () => {
    setMessage(null);
    setBusy(true);
    try {
      if (repeat === "once" && !runOnceDate) {
        setMessage("Choose a date for a one-time reminder.");
        setBusy(false);
        return;
      }
      if (editingId) {
        const res = await fetch(`/api/user/custom-reminders/${editingId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            body,
            scheduledTime: time,
            repeatType: repeat,
            runOnceOnIstDate: repeat === "once" ? runOnceDate : null,
            clearLastFired: true,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setMessage(surfaceOptionalString(data.error, "Could not update."));
          return;
        }
        setMessage("Reminder updated.");
        showToast("Reminder updated.");
      } else {
        const res = await fetch("/api/user/custom-reminders", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            body,
            scheduledTime: time,
            repeatType: repeat,
            runOnceOnIstDate: repeat === "once" ? runOnceDate : undefined,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setMessage(surfaceOptionalString(data.error, "Could not save."));
          return;
        }
        setMessage("Reminder saved.");
        showToast("Reminder saved.");
      }
      setFormOpen(false);
      resetForm();
      await load();
    } catch {
      setMessage("Something went wrong.");
    } finally {
      setBusy(false);
    }
  }, [body, editingId, load, repeat, resetForm, runOnceDate, showToast, time, title]);

  const deleteReminder = useCallback(
    async (id: string) => {
      if (!confirm("Delete this reminder?")) return;
      setBusy(true);
      setMessage(null);
      try {
        const res = await fetch(`/api/user/custom-reminders/${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          setMessage(surfaceOptionalString(data.error, "Delete failed."));
          return;
        }
        if (editingId === id) {
          setFormOpen(false);
          resetForm();
        }
        setMessage("Reminder deleted.");
        showToast("Reminder removed.", "neutral");
        await load();
      } catch {
        setMessage("Delete failed.");
      } finally {
        setBusy(false);
      }
    },
    [editingId, load, resetForm, showToast],
  );

  const toggleActive = useCallback(
    async (r: CustomReminderRow, next: boolean) => {
      setBusy(true);
      try {
        const res = await fetch(`/api/user/custom-reminders/${r.id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: next }),
        });
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          setMessage(surfaceOptionalString(data.error, "Could not update."));
          return;
        }
        await load();
        showToast(next ? "Reminder on." : "Reminder paused.", next ? "success" : "neutral");
      } catch {
        setMessage("Could not update.");
      } finally {
        setBusy(false);
      }
    },
    [load, showToast],
  );

  if (!user) return null;

  const shellClass = embedded
    ? "rounded-xl border border-white/12 bg-white/[0.035] px-3 py-4 dark:border-white/10 dark:bg-black/25"
    : "kal-glass-panel rounded-[1rem] px-3 py-4";

  return (
    <div className={shellClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        {!embedded ? (
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <AlarmClock
              className="mt-0.5 size-5 shrink-0 text-kal-accent"
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-[15px] font-medium text-kal-text">My reminders</p>
              <p className="mt-0.5 text-xs leading-relaxed text-kal-text-secondary">
                Your own push nudges at a time you pick (India Standard Time). Works
                when push is enabled on a device. Repeats daily or runs once on a
                chosen date.
              </p>
            </div>
          </div>
        ) : (
          <div className="min-w-0 flex-1" />
        )}
        <button
          type="button"
          onClick={() => (formOpen ? (setFormOpen(false), resetForm()) : openNew())}
          disabled={busy || loading}
          className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 text-sm font-medium text-kal-text backdrop-blur-sm transition-colors hover:bg-white/15 disabled:opacity-50"
        >
          {formOpen ? (
            "Close"
          ) : (
            <>
              <Plus className="size-4" aria-hidden />
              Add reminder
            </>
          )}
        </button>
      </div>

      <p className={clsx("text-[11px] text-kal-text-secondary", embedded ? "mt-2" : "mt-3")}>
        Examples:{" "}
        {EXAMPLES.map((ex, i) => (
          <span key={ex.title}>
            {i > 0 ? " · " : null}
            <button
              type="button"
              disabled={busy || loading}
              className="font-medium text-kal-accent underline-offset-2 hover:underline"
              onClick={() => {
                setTitle(ex.title);
                setBody(ex.body);
                setTime(ex.time);
                setRepeat("daily");
                setFormOpen(true);
              }}
            >
              {ex.title}
            </button>
          </span>
        ))}
      </p>

      {formOpen ? (
        <div className="mt-4 space-y-3 rounded-xl border border-white/15 bg-white/5 p-3 dark:bg-black/20">
          <div>
            <label
              htmlFor={`${baseId}-title`}
              className="text-[11px] font-medium uppercase tracking-wide text-kal-text-secondary"
            >
              Title
            </label>
            <input
              id={`${baseId}-title`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="e.g. Study Biology now"
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-kal-text placeholder:text-kal-text-secondary/70"
            />
          </div>
          <div>
            <label
              htmlFor={`${baseId}-body`}
              className="text-[11px] font-medium uppercase tracking-wide text-kal-text-secondary"
            >
              Message
            </label>
            <textarea
              id={`${baseId}-body`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="What should this nudge say?"
              className="mt-1 w-full resize-y rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-kal-text placeholder:text-kal-text-secondary/70"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <div>
              <label
                htmlFor={`${baseId}-time`}
                className="text-[11px] font-medium uppercase tracking-wide text-kal-text-secondary"
              >
                Time (IST)
              </label>
              <input
                id={`${baseId}-time`}
                type="time"
                step={60}
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1 block rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-kal-text"
              />
            </div>
            <div>
              <span className="text-[11px] font-medium uppercase tracking-wide text-kal-text-secondary">
                Repeat
              </span>
              <div className="mt-1 flex gap-2">
                {(["daily", "once"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    disabled={busy}
                    onClick={() => setRepeat(r)}
                    className={clsx(
                      "rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                      repeat === r
                        ? "bg-kal-accent text-white"
                        : "border border-white/15 bg-white/10 text-kal-text hover:bg-white/15",
                    )}
                  >
                    {r === "daily" ? "Daily" : "Once"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {repeat === "once" ? (
            <div>
              <label
                htmlFor={`${baseId}-date`}
                className="text-[11px] font-medium uppercase tracking-wide text-kal-text-secondary"
              >
                Run on (IST date)
              </label>
              <input
                id={`${baseId}-date`}
                type="date"
                min={istToday}
                value={runOnceDate}
                onChange={(e) => setRunOnceDate(e.target.value)}
                className="mt-1 block rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm text-kal-text"
              />
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={busy || !title.trim() || !body.trim()}
              onClick={() => void submitForm()}
              className="inline-flex min-h-[40px] items-center rounded-xl bg-kal-accent px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {editingId ? "Save changes" : "Save reminder"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setFormOpen(false);
                resetForm();
              }}
              className="inline-flex min-h-[40px] items-center rounded-xl border border-white/20 px-4 text-sm font-medium text-kal-text hover:bg-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="space-y-2" aria-busy="true" aria-label="Loading reminders">
            {[0, 1, 2].map((k) => (
              <div
                key={k}
                className="animate-pulse rounded-xl border border-white/10 bg-white/5 p-3 dark:bg-black/20"
              >
                <div className="h-4 w-[45%] max-w-[14rem] rounded bg-kal-border/50" />
                <div className="mt-2 h-3 w-full rounded bg-kal-border/35" />
                <div className="mt-2 h-3 w-[72%] rounded bg-kal-border/30" />
              </div>
            ))}
          </div>
        ) : reminders.length === 0 ? (
          <p className="text-sm text-kal-text-secondary">
            No reminders yet. Use Add reminder for Biology blocks, breaks, or chapter
            revision.
          </p>
        ) : (
          reminders.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-white/12 bg-white/5 px-3 py-2.5 dark:bg-black/15"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-kal-text">{r.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-kal-text-secondary">
                  {r.body}
                </p>
                <p className="mt-1 text-[11px] text-kal-muted">
                  {dbTimeToInputValue(r.scheduled_time)} IST ·{" "}
                  {r.repeat_type === "daily" ? "Daily" : `Once · ${r.run_once_on_ist_date ?? "—"}`}
                  {r.last_fired_ist_date ? ` · Last sent ${r.last_fired_ist_date}` : null}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <SettingsSheetSwitch
                  id={`${baseId}-act-${r.id}`}
                  size="sm"
                  checked={r.is_active}
                  disabled={busy}
                  onChange={(n) => void toggleActive(r, n)}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => startEdit(r)}
                  className="rounded-lg border border-white/15 p-2 text-kal-text hover:bg-white/10"
                  aria-label="Edit reminder"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void deleteReminder(r.id)}
                  className="rounded-lg border border-white/15 p-2 text-kal-text hover:bg-red-500/15"
                  aria-label="Delete reminder"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {message ? (
        <p
          className="mt-3 text-xs leading-relaxed text-kal-text-secondary"
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
