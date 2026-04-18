"use client";

import { format, parseISO } from "date-fns";
import clsx from "clsx";
import { BellPlus, Loader2, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";


import {
  createScheduledNotification,
  deleteScheduledNotification,
  listScheduledNotifications,
  type ScheduledNotificationRow,
} from "@/actions/scheduledNotifications";
import { SCHEDULED_NOTIFICATION_TAGS } from "@/lib/scheduledNotifications/tags";
import { SmartNotificationSetupBanner } from "@/components/smart-notification/SmartNotificationSetupBanner";
import { useAiGate } from "@/hooks/useAiGate";
import { surfaceOptionalString } from "@/lib/userFacingErrors";
import { useVoiceNotificationStore } from "@/store/useVoiceNotificationStore";

function formatFire(iso: string): string {
  try {
    const d = parseISO(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return format(d, "MMM d, yyyy · h:mm a");
  } catch {
    return iso;
  }
}

export function NotificationHubPageClient({
  initialRows,
  userId,
}: {
  initialRows: ScheduledNotificationRow[];
  userId: string | null;
}) {
  const openVoiceSheet = useVoiceNotificationStore((s) => s.openSheet);
  const { voiceMinuteStatus } = useAiGate();

  const [rows, setRows] = useState<ScheduledNotificationRow[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState<"voice" | "text">("text");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [notifyLocal, setNotifyLocal] = useState("");
  /** Draft picks until user taps Select (native datetime-local cannot show a Select inside its popup). */
  const [whenDateDraft, setWhenDateDraft] = useState("");
  const [whenTimeDraft, setWhenTimeDraft] = useState("");
  const [tag, setTag] = useState<string>("Study");
  const [repeatType, setRepeatType] = useState<"once" | "daily" | "weekly">("once");
  const [subject, setSubject] = useState("");
  const [chapter, setChapter] = useState("");

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await listScheduledNotifications();
      if (res.ok) setRows(res.rows);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const { upcoming, past } = useMemo(() => {
    const up: ScheduledNotificationRow[] = [];
    const pa: ScheduledNotificationRow[] = [];
    for (const r of rows) {
      const t = new Date(r.next_fire_at).getTime();
      if (r.is_active && !Number.isNaN(t)) {
        up.push(r);
      } else {
        pa.push(r);
      }
    }
    up.sort((a, b) => a.next_fire_at.localeCompare(b.next_fire_at));
    pa.sort((a, b) => b.next_fire_at.localeCompare(a.next_fire_at));
    return { upcoming: up, past: pa };
  }, [rows]);

  const resetForm = () => {
    setTitle("");
    setNotifyLocal("");
    setWhenDateDraft("");
    setWhenTimeDraft("");
    setTag("Study");
    setRepeatType("once");
    setSubject("");
    setChapter("");
    setFormError(null);
  };

  const applyWhenSelection = () => {
    if (!whenDateDraft?.trim() || !whenTimeDraft?.trim()) {
      setFormError("Choose a date and a time, then tap Select.");
      return;
    }
    const timePart = whenTimeDraft.trim().slice(0, 5);
    const combined = `${whenDateDraft.trim()}T${timePart}`;
    const next = new Date(combined);
    if (Number.isNaN(next.getTime())) {
      setFormError("Invalid date or time.");
      return;
    }
    setNotifyLocal(combined);
    setFormError(null);
  };

  const closeAdd = () => {
    setAddOpen(false);
    resetForm();
  };

  const submitText = async () => {
    setFormError(null);
    const t = title.trim();
    if (!t) {
      setFormError("Title is required.");
      return;
    }
    if (!notifyLocal) {
      setFormError("Choose date and time, then tap Select.");
      return;
    }
    const next = new Date(notifyLocal);
    if (Number.isNaN(next.getTime())) {
      setFormError("Invalid date or time.");
      return;
    }
    const tz =
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
        : "UTC";

    setSaving(true);
    try {
      const res = await createScheduledNotification({
        title: t,
        tag,
        subject: subject.trim() || null,
        chapter: chapter.trim() || null,
        next_fire_at: next.toISOString(),
        user_timezone: tz,
        repeat_type: repeatType,
      });
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      closeAdd();
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    const res = await deleteScheduledNotification(id);
    if (res.ok) await refresh();
  };

  if (!userId) {
    return (
      <section className="kal-glass-panel mx-auto w-full max-w-2xl rounded-[1.25rem] p-6 text-center sm:p-8">
        <p className="text-lg font-semibold text-kal-text">Sign in required</p>
        <p className="mt-2 text-sm text-kal-muted">
          Please sign in to manage smart notifications.
        </p>
        <Link href="/auth" className="kal-btn-accent mt-5 inline-flex min-h-[44px] items-center justify-center">
          Go to sign in
        </Link>
      </section>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-kal-text">Smart notifications</h1>
        <p className="text-sm leading-relaxed text-kal-text-secondary">
          Schedule push notifications by voice (uses Dictate minutes: {voiceMinuteStatus}) or typing
          (unlimited).
        </p>
        <p className="text-sm">
          <Link href="/notifications" className="font-medium text-kal-accent-dark underline-offset-2 hover:underline">
            View alert inbox
          </Link>
        </p>
      </header>

      <SmartNotificationSetupBanner />

      <p className="text-sm leading-relaxed text-kal-text-secondary">
        <span className="font-medium text-kal-text">For voice:</span> say what you need to do and when
        to notify you—for example, “Remind me to revise Physics tomorrow at 6 pm” or “Every weekday at
        8 am, nudge me to start studying.” You can use{" "}
        <span className="font-medium text-kal-text">Voice capture</span> or{" "}
        <span className="font-medium text-kal-text">Add notification</span> → Voice.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            resetForm();
            setAddTab("text");
            setAddOpen(true);
          }}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-kal-accent/40 bg-kal-accent px-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
        >
          <BellPlus className="h-4 w-4" />
          Add notification
        </button>
        <button
          type="button"
          onClick={() => {
            closeAdd();
            openVoiceSheet();
          }}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-kal-border bg-kal-card-muted px-4 text-sm font-semibold text-kal-text transition hover:bg-white/80 dark:hover:bg-white/10"
        >
          Voice capture
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void refresh()}
          className="text-sm font-medium text-kal-accent-dark underline-offset-2 hover:underline disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {addOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--kal-overlay)] backdrop-blur-[2px] sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Add notification"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border-2 border-kal-border-strong bg-kal-bg-elevated p-4 shadow-2xl sm:rounded-2xl sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-kal-text">Add notification</h2>
              <button
                type="button"
                onClick={closeAdd}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-kal-border-strong bg-kal-input-bg text-kal-text transition hover:bg-kal-card-muted"
                aria-label="Close"
              >
                <X className="h-5 w-5" strokeWidth={2.25} />
              </button>
            </div>

            <div className="mb-4 flex gap-1 rounded-xl border-2 border-kal-border-strong bg-kal-input-bg p-1">
              <button
                type="button"
                onClick={() => setAddTab("text")}
                className={clsx(
                  "flex-1 rounded-lg py-2 text-sm font-semibold transition",
                  addTab === "text"
                    ? "bg-kal-accent text-white shadow-sm"
                    : "text-kal-text-secondary hover:bg-kal-card-muted",
                )}
              >
                Type
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddTab("voice");
                  closeAdd();
                  openVoiceSheet();
                }}
                className={clsx(
                  "flex-1 rounded-lg py-2 text-sm font-semibold transition",
                  addTab === "voice"
                    ? "bg-kal-accent text-white shadow-sm"
                    : "text-kal-text-secondary hover:bg-kal-card-muted",
                )}
              >
                Voice
              </button>
            </div>

            {addTab === "text" ? (
              <div className="space-y-3 text-sm">
                {formError ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
                    {surfaceOptionalString(formError, "Something went wrong.")}
                  </p>
                ) : null}
                <label className="block text-sm font-medium text-kal-text-secondary">
                  Title
                  <input
                    className="mt-1.5 w-full rounded-lg border-2 border-kal-border-strong bg-kal-input-bg px-3 py-2.5 text-kal-text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>
                <div className="rounded-xl border-2 border-kal-border-strong bg-kal-input-bg/50 p-3">
                  <p className="text-sm font-medium text-kal-text-secondary">When</p>
                  <p className="mt-0.5 text-xs text-kal-muted">
                    Pick a date and time, then tap <span className="font-semibold text-kal-text-secondary">Select</span>{" "}
                    to use it for this notification.
                  </p>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label className="block text-xs font-medium text-kal-text-secondary">
                      Date
                      <input
                        type="date"
                        className="mt-1 w-full rounded-lg border-2 border-kal-border-strong bg-kal-input-bg px-3 py-2 text-kal-text"
                        value={whenDateDraft}
                        onChange={(e) => setWhenDateDraft(e.target.value)}
                      />
                    </label>
                    <label className="block text-xs font-medium text-kal-text-secondary">
                      Time
                      <input
                        type="time"
                        step={60}
                        className="mt-1 w-full rounded-lg border-2 border-kal-border-strong bg-kal-input-bg px-3 py-2 text-kal-text"
                        value={whenTimeDraft}
                        onChange={(e) => setWhenTimeDraft(e.target.value)}
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={applyWhenSelection}
                    className="mt-2 flex min-h-[40px] w-full items-center justify-center rounded-lg border-2 border-kal-accent/40 bg-kal-accent-soft px-3 text-sm font-semibold text-kal-accent-dark transition hover:bg-kal-accent/15"
                  >
                    Select
                  </button>
                  {notifyLocal ? (
                    <p className="mt-2 text-xs text-kal-text-secondary" role="status">
                      Using:{" "}
                      <span className="font-medium text-kal-text">
                        {(() => {
                          const d = new Date(notifyLocal);
                          return Number.isNaN(d.getTime())
                            ? notifyLocal
                            : format(d, "MMM d, yyyy · h:mm a");
                        })()}
                      </span>
                    </p>
                  ) : null}
                </div>
                <label className="block text-sm font-medium text-kal-text-secondary">
                  Tag
                  <select
                    className="mt-1.5 w-full rounded-lg border-2 border-kal-border-strong bg-kal-input-bg px-3 py-2.5 text-kal-text"
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                  >
                    {SCHEDULED_NOTIFICATION_TAGS.map((x) => (
                      <option key={x} value={x}>
                        {x}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-kal-text-secondary">
                  Repeat
                  <select
                    className="mt-1.5 w-full rounded-lg border-2 border-kal-border-strong bg-kal-input-bg px-3 py-2.5 text-kal-text"
                    value={repeatType}
                    onChange={(e) =>
                      setRepeatType(e.target.value as "once" | "daily" | "weekly")
                    }
                  >
                    <option value="once">Once</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </label>
                <label className="block text-sm font-medium text-kal-text-secondary">
                  Subject (optional)
                  <input
                    className="mt-1.5 w-full rounded-lg border-2 border-kal-border-strong bg-kal-input-bg px-3 py-2.5 text-kal-text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </label>
                <label className="block text-sm font-medium text-kal-text-secondary">
                  Chapter (optional)
                  <input
                    className="mt-1.5 w-full rounded-lg border-2 border-kal-border-strong bg-kal-input-bg px-3 py-2.5 text-kal-text"
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void submitText()}
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-kal-accent py-3 text-sm font-bold text-white shadow-md disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save notification
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-kal-text">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-kal-text-secondary">No active scheduled notifications.</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((r) => (
              <li
                key={r.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-kal-border bg-kal-card-muted/50 px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-kal-text">{r.title}</p>
                  <p className="text-xs text-kal-muted">
                    {formatFire(r.next_fire_at)} · {r.tag} · {r.repeat_type}
                  </p>
                  {(r.subject || r.chapter) && (
                    <p className="mt-1 text-xs text-kal-muted">
                      {[r.subject, r.chapter].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void onDelete(r.id)}
                  className="shrink-0 rounded-lg border border-kal-border p-2 text-kal-muted hover:text-red-600"
                  aria-label="Delete notification"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-kal-text">Past</h2>
        {past.length === 0 ? (
          <p className="text-sm text-kal-text-secondary">
            No completed or inactive notifications yet.
          </p>
        ) : (
          <ul className="space-y-2 opacity-90">
            {past.map((r) => (
              <li
                key={r.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-kal-border/70 bg-kal-card-muted/30 px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-kal-text line-through">{r.title}</p>
                  <p className="text-xs text-kal-muted">
                    {formatFire(r.next_fire_at)} · {r.tag}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void onDelete(r.id)}
                  className="shrink-0 rounded-lg border border-kal-border p-2 text-kal-muted hover:text-red-600"
                  aria-label="Delete notification"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
