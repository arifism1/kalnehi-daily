"use client";

import { format } from "date-fns";
import { useState } from "react";

import {
  deleteAppUpdate,
  publishAppUpdate,
} from "@/actions/adminNotifications";
import {
  APP_UPDATE_CATEGORIES,
  type AdminAppUpdate,
  type AppUpdateCategory,
} from "@/actions/adminNotifications.types";


const CATEGORY_PILL: Record<string, string> = {
  "New Feature":
    "inline-flex items-center rounded-full border border-violet-200/90 bg-violet-50/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-900/90 dark:border-violet-500/30 dark:bg-violet-950/50 dark:text-violet-200",
  Improvement:
    "inline-flex items-center rounded-full border border-sky-200/90 bg-sky-50/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-900/90 dark:border-sky-500/30 dark:bg-sky-950/50 dark:text-sky-200",
  "Bug Fix":
    "inline-flex items-center rounded-full border border-rose-200/90 bg-rose-50/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-900/90 dark:border-rose-500/30 dark:bg-rose-950/50 dark:text-rose-200",
  Announcement:
    "inline-flex items-center rounded-full border border-amber-200/90 bg-amber-50/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900/90 dark:border-amber-500/30 dark:bg-amber-950/50 dark:text-amber-100",
};

function categoryPillClass(cat: string) {
  return (
    CATEGORY_PILL[cat] ??
    "inline-flex items-center rounded-full border border-kal-border/80 bg-kal-card-muted/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-kal-text-secondary"
  );
}

type Props = {
  initialUpdates: AdminAppUpdate[];
};

export function AdminSendUpdateForm({ initialUpdates }: Props) {
  const [updates, setUpdates] = useState<AdminAppUpdate[]>(initialUpdates);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<AppUpdateCategory>("Announcement");
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedId, setPublishedId] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (publishing || !title.trim() || !message.trim()) return;
    setPublishing(true);
    setPublishError(null);
    setPublishedId(null);

    const res = await publishAppUpdate(title.trim(), message.trim(), category);
    setPublishing(false);

    if (!res.ok) {
      setPublishError(res.error);
      return;
    }
    setPublishedId(res.id);
    const newUpdate: AdminAppUpdate = {
      id: res.id,
      title: title.trim(),
      message: message.trim(),
      category,
      created_at: new Date().toISOString(),
      read_count: 0,
    };
    setUpdates((prev) => [newUpdate, ...prev]);
    setTitle("");
    setMessage("");
  }

  async function handleDelete(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    const res = await deleteAppUpdate(id);
    setDeletingId(null);
    if (!res.ok) return;
    setUpdates((prev) => prev.filter((u) => u.id !== id));
  }

  return (
    <div className="space-y-8">
      {/* Compose form */}
      <section className="rounded-2xl border border-kal-border bg-kal-card/40 p-5">
        <h2 className="mb-4 text-sm font-semibold text-kal-text">
          Send update to all users
        </h2>
        <form onSubmit={(e) => { void handlePublish(e); }} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-kal-text-secondary" htmlFor="upd-category">
              Category
            </label>
            <select
              id="upd-category"
              value={category}
              onChange={(e) => { setCategory(e.target.value as AppUpdateCategory); }}
              className="w-full rounded-lg border border-kal-border bg-kal-card px-3 py-2 text-sm text-kal-text focus:outline-none focus:ring-2 focus:ring-kal-accent/40"
            >
              {APP_UPDATE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-kal-text-secondary" htmlFor="upd-title">
              Title
            </label>
            <input
              id="upd-title"
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); }}
              placeholder="e.g. Smart Revision is now live"
              maxLength={120}
              required
              className="w-full rounded-lg border border-kal-border bg-kal-card px-3 py-2 text-sm text-kal-text placeholder:text-kal-muted focus:outline-none focus:ring-2 focus:ring-kal-accent/40"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-kal-text-secondary" htmlFor="upd-message">
              Message
            </label>
            <textarea
              id="upd-message"
              value={message}
              onChange={(e) => { setMessage(e.target.value); }}
              placeholder="Describe what changed and why it matters to users…"
              rows={4}
              maxLength={1000}
              required
              className="w-full resize-none rounded-lg border border-kal-border bg-kal-card px-3 py-2 text-sm text-kal-text placeholder:text-kal-muted focus:outline-none focus:ring-2 focus:ring-kal-accent/40"
            />
            <p className="text-right text-[10px] text-kal-muted tabular-nums">
              {message.length}/1000
            </p>
          </div>

          {publishError ? (
            <p className="text-xs text-[var(--kal-warn-text)]">{publishError}</p>
          ) : null}

          {publishedId ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              Published — visible to all users now.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={publishing || !title.trim() || !message.trim()}
            className="min-h-[40px] rounded-xl bg-kal-accent px-5 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
          >
            {publishing ? "Publishing…" : "Publish to all users"}
          </button>
        </form>
      </section>

      {/* Sent updates history */}
      <section className="rounded-2xl border border-kal-border bg-kal-card/40 p-5">
        <h2 className="mb-4 text-sm font-semibold text-kal-text">
          Sent updates
          <span className="ml-2 tabular-nums text-kal-muted">({updates.length})</span>
        </h2>

        {updates.length === 0 ? (
          <p className="text-sm text-kal-muted">No updates sent yet.</p>
        ) : (
          <ul className="divide-y divide-kal-border">
            {updates.map((u) => (
              <li key={u.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={categoryPillClass(u.category)}>{u.category}</span>
                      <p className="text-sm font-semibold text-kal-text">{u.title}</p>
                    </div>
                    <p className="text-sm text-kal-muted">{u.message}</p>
                    <div className="flex items-center gap-3 text-[11px] text-kal-text-secondary">
                      <span>{format(new Date(u.created_at), "MMM d, yyyy · h:mm a")}</span>
                      <span className="tabular-nums">
                        {u.read_count} {u.read_count === 1 ? "read" : "reads"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { void handleDelete(u.id); }}
                    disabled={deletingId === u.id}
                    aria-label="Delete update"
                    className="shrink-0 rounded-lg px-2 py-1 text-xs text-kal-muted transition-colors hover:bg-rose-50/80 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                  >
                    {deletingId === u.id ? "…" : "Delete"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
