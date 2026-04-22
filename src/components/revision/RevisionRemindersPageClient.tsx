"use client";

import clsx from "clsx";
import { addDays, format, parseISO } from "date-fns";
import {
  AlarmClock,
  Archive,
  Check,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SyllabusComingSoon } from "@/components/syllabus/SyllabusComingSoon";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { usePrimaryExamLabel } from "@/hooks/usePrimaryExamLabel";
import { useSyllabusTracker } from "@/hooks/useSyllabusTracker";
import { shouldShowSyllabusComingSoon } from "@/lib/examProfile";
import {
  isRevisionReminderOnOrAfterDate,
  type RevisionDifficulty,
} from "@/lib/engine/revisionSchedule";
import { normalizeSyllabusMasterId } from "@/lib/syllabusIds";
import type { MergedSyllabusRow } from "@/lib/userSyllabusMerge";
import {
  hydrateUserPlannerTextFromServer,
  plannerTextAppendRevisionReminder,
  plannerTextMarkRevisionReminderDone,
  plannerTextRemoveRevision,
  plannerTextSetRevisionReminderStatus,
} from "@/lib/userPlannerTextClient";
import { getUserPlannerTextBundleCached } from "@/lib/userPlannerTextLocal";
import type { RevisionQueueEntry } from "@/lib/userPlannerTextTypes";
import { useAuthStore } from "@/store/useAuthStore";

const TOPIC_MATCH_CAP = 40;

function rowLabel(r: MergedSyllabusRow): string {
  return (r.microtopic ?? "").trim() || (r.chapter ?? "").trim() || "Topic";
}

function formatRowForDisplay(r: MergedSyllabusRow): string {
  return `${rowLabel(r)} · ${(r.subject ?? "").trim() || "Subject"}`;
}

const PRIORITY_LABEL: Record<RevisionDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

function statusLabel(s: RevisionQueueEntry["status"]): string {
  switch (s) {
    case "done":
      return "Done";
    case "archived":
      return "Archived";
    default:
      return "Pending";
  }
}

export function RevisionRemindersPageClient() {
  const userId = useAuthStore((s) => s.user?.id);
  const today = useCalendarDate();
  const { examLabel, loading: examLoading } = usePrimaryExamLabel();
  const {
    rows,
    cuetAwaitingDomainSelection,
    loading: syllabusLoading,
    error: syllabusError,
  } = useSyllabusTracker();

  const syllabusSoon = shouldShowSyllabusComingSoon({
    examLabel,
    examLabelLoading: examLoading,
    syllabusLoading,
    syllabusError,
    syllabusRowCount: rows.length,
    cuetAwaitingDomainSelection,
  });

  const [items, setItems] = useState<RevisionQueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [sourceTab, setSourceTab] = useState<"custom" | "syllabus">("custom");
  const [titleInput, setTitleInput] = useState("");
  const [nextDue, setNextDue] = useState(() =>
    format(addDays(parseISO(today), 7), "yyyy-MM-dd"),
  );
  const [difficulty, setDifficulty] = useState<RevisionDifficulty>("medium");
  const [notesInput, setNotesInput] = useState("");
  const [syllabusQuery, setSyllabusQuery] = useState("");
  const [syllabusPickerOpen, setSyllabusPickerOpen] = useState(false);
  const [selectedSyllabusId, setSelectedSyllabusId] = useState<string | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RevisionQueueEntry | null>(
    null,
  );
  const [deleteBusy, setDeleteBusy] = useState(false);

  const searchWrapRef = useRef<HTMLDivElement | null>(null);

  const rowById = useMemo(() => {
    const m = new Map<string, MergedSyllabusRow>();
    for (const r of rows) {
      m.set(normalizeSyllabusMasterId(String(r.id)), r);
    }
    return m;
  }, [rows]);

  const filteredSyllabusRows = useMemo(() => {
    const q = syllabusQuery.trim().toLowerCase();
    if (!q) return rows.slice(0, TOPIC_MATCH_CAP);
    const out: MergedSyllabusRow[] = [];
    for (const r of rows) {
      const hay = `${rowLabel(r)} ${(r.chapter ?? "").trim()} ${(r.subject ?? "").trim()}`
        .toLowerCase();
      if (hay.includes(q)) {
        out.push(r);
        if (out.length >= TOPIC_MATCH_CAP) break;
      }
    }
    return out;
  }, [rows, syllabusQuery]);

  const refresh = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const bundle = await hydrateUserPlannerTextFromServer(userId);
      setItems(bundle.revisionItems);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!modalOpen) return;
    setNextDue(format(addDays(parseISO(today), 7), "yyyy-MM-dd"));
  }, [modalOpen, today]);

  useEffect(() => {
    if (!modalOpen || sourceTab !== "syllabus") return;
    const id = selectedSyllabusId;
    if (!id) return;
    const r = rowById.get(normalizeSyllabusMasterId(id));
    if (r) setTitleInput(formatRowForDisplay(r));
  }, [modalOpen, sourceTab, selectedSyllabusId, rowById]);

  useEffect(() => {
    if (typeof window === "undefined" || !userId) return;
    const onPlanner = () => {
      void getUserPlannerTextBundleCached(userId).then((b) => {
        if (b) setItems(b.revisionItems);
      });
    };
    window.addEventListener("kalnehi-user-planner-text-changed", onPlanner);
    return () =>
      window.removeEventListener(
        "kalnehi-user-planner-text-changed",
        onPlanner,
      );
  }, [userId]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!searchWrapRef.current?.contains(e.target as Node)) {
        setSyllabusPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc, true);
    return () => document.removeEventListener("mousedown", onDoc, true);
  }, []);

  const sortedItems = useMemo(() => {
    const list = items.filter(
      (r) =>
        (showArchived || r.status !== "archived") &&
        isRevisionReminderOnOrAfterDate(r, today),
    );
    const rank = (s: string) =>
      s === "pending" ? 0 : s === "done" ? 1 : 2;
    return [...list].sort((a, b) => {
      const d = rank(a.status) - rank(b.status);
      if (d !== 0) return d;
      return a.nextDue.localeCompare(b.nextDue);
    });
  }, [items, showArchived, today]);

  const openAddModal = () => {
    setFormError(null);
    setSourceTab("custom");
    setTitleInput("");
    setNotesInput("");
    setDifficulty("medium");
    setSyllabusQuery("");
    setSelectedSyllabusId(null);
    setSyllabusPickerOpen(false);
    setNextDue(format(addDays(parseISO(today), 7), "yyyy-MM-dd"));
    setModalOpen(true);
  };

  const onSubmitAdd = async () => {
    if (!userId) return;
    const title = titleInput.trim();
    if (!title) {
      setFormError("Add a topic name.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDue.trim())) {
      setFormError("Pick a valid due date.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const microtopicId =
        sourceTab === "syllabus" && selectedSyllabusId
          ? normalizeSyllabusMasterId(selectedSyllabusId)
          : undefined;
      const bundle = await plannerTextAppendRevisionReminder(userId, {
        title,
        difficulty,
        nextDue: nextDue.trim(),
        microtopicId,
        notes: notesInput.trim() || undefined,
      });
      setItems(bundle.revisionItems);
      setModalOpen(false);
    } catch {
      setFormError("Could not save. Try again when online.");
    } finally {
      setSaving(false);
    }
  };

  const pickSyllabusRow = (r: MergedSyllabusRow) => {
    const id = normalizeSyllabusMasterId(String(r.id));
    setSelectedSyllabusId(id);
    setTitleInput(formatRowForDisplay(r));
    setSyllabusPickerOpen(false);
  };

  return (
    <div className="relative mx-auto max-w-2xl pb-20 pt-2 [contain:layout_style_paint] sm:pt-4">
      <div
        className="pointer-events-none absolute -right-20 -top-8 h-48 w-48 rounded-full bg-kal-accent/8 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 -left-16 h-40 w-40 rounded-full bg-kal-accent/5 blur-3xl"
        aria-hidden
      />

      <Link
        href="/home"
        className="relative mb-6 inline-flex text-sm font-semibold text-kal-accent transition-colors hover:text-kal-accent-hover"
      >
        ← Back
      </Link>

      <header className="relative mb-8">
        <p className="kal-category-label text-kal-accent">Study tools</p>
        <h1 className="kal-feature-title mt-2 flex items-center gap-2.5">
          <AlarmClock className="h-7 w-7 shrink-0 text-kal-accent/90" aria-hidden />
          Revision Reminders
        </h1>
          <p className="kal-feature-lead mt-3 max-w-xl">
          Today and upcoming due dates only — past-due reminders live under Missed
          Tasks. Your list is what you add; nothing is dropped into your daily
          plan automatically.
        </p>
      </header>

      {!userId ? (
        <div className="kal-glass-card rounded-2xl border border-kal-border/60 p-6 text-sm text-kal-muted">
          Sign in to save and sync revision reminders across devices.
        </div>
      ) : null}

      {syllabusSoon && examLabel ? (
        <div className="mb-6">
          <SyllabusComingSoon variant="compact" examLabel={examLabel} />
        </div>
      ) : null}

      <div className="relative mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setShowArchived((v) => !v)}
          className="text-xs font-semibold text-kal-muted underline decoration-kal-border underline-offset-2 hover:text-kal-text"
        >
          {showArchived ? "Hide archived" : "Show archived"}
        </button>
        <button
          type="button"
          onClick={openAddModal}
          disabled={!userId}
          className="kal-btn-accent inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:pointer-events-none disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add New Reminder
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-kal-accent/50" aria-label="Loading" />
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="kal-glass-card rounded-2xl border border-kal-border/50 p-8 text-center">
          <p className="text-sm text-kal-muted">
            No reminders due today or later. Add one for a future date, or check
            Missed Tasks if something was due before today.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {sortedItems.map((it) => (
            <li
              key={it.id}
              className="kal-glass-card rounded-xl border border-kal-border/50 px-4 py-3.5"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug text-kal-text">
                    {it.title}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-kal-muted">
                    <span>
                      Due{" "}
                      <span className="font-medium tabular-nums text-kal-text-secondary">
                        {it.nextDue}
                      </span>
                    </span>
                    <span>{PRIORITY_LABEL[it.difficulty]}</span>
                    <span>{statusLabel(it.status)}</span>
                  </div>
                  {it.notes.trim() ? (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-kal-text-secondary">
                      {it.notes}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5 sm:justify-end">
                  {it.status === "pending" ? (
                    <button
                      type="button"
                      className="rounded-lg border border-kal-border/70 bg-kal-card-muted px-2.5 py-1.5 text-[11px] font-semibold text-kal-text hover:bg-kal-accent-soft/50"
                      onClick={() => {
                        if (!userId) return;
                        void (async () => {
                          const b = await plannerTextMarkRevisionReminderDone(
                            userId,
                            it.id,
                            today,
                          );
                          setItems(b.revisionItems);
                        })();
                      }}
                    >
                      <Check className="mr-1 inline h-3 w-3" aria-hidden />
                      Done
                    </button>
                  ) : it.status === "done" ? (
                    <button
                      type="button"
                      className="rounded-lg border border-kal-border/70 px-2.5 py-1.5 text-[11px] font-semibold text-kal-muted hover:bg-kal-card-muted"
                      onClick={() => {
                        if (!userId) return;
                        void (async () => {
                          const b = await plannerTextSetRevisionReminderStatus(
                            userId,
                            it.id,
                            "pending",
                          );
                          setItems(b.revisionItems);
                        })();
                      }}
                    >
                      Reopen
                    </button>
                  ) : null}
                  {it.status !== "archived" ? (
                    <button
                      type="button"
                      className="rounded-lg border border-kal-border/70 px-2.5 py-1.5 text-[11px] font-semibold text-kal-muted hover:bg-kal-card-muted"
                      onClick={() => {
                        if (!userId) return;
                        void (async () => {
                          const b = await plannerTextSetRevisionReminderStatus(
                            userId,
                            it.id,
                            "archived",
                          );
                          setItems(b.revisionItems);
                        })();
                      }}
                    >
                      <Archive className="mr-1 inline h-3 w-3" aria-hidden />
                      Archive
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="rounded-lg border border-kal-border/70 px-2.5 py-1.5 text-[11px] font-semibold text-kal-muted hover:bg-kal-card-muted"
                      onClick={() => {
                        if (!userId) return;
                        void (async () => {
                          const b = await plannerTextSetRevisionReminderStatus(
                            userId,
                            it.id,
                            "pending",
                          );
                          setItems(b.revisionItems);
                        })();
                      }}
                    >
                      Restore
                    </button>
                  )}
                  <button
                    type="button"
                    className="rounded-lg border border-rose-200/80 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-950/40"
                    onClick={() => setDeleteTarget(it)}
                  >
                    <Trash2 className="mr-1 inline h-3 w-3" aria-hidden />
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center"
          role="presentation"
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-kal-overlay backdrop-blur-sm"
            onClick={() => !saving && setModalOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="revision-reminder-modal-title"
            className="kal-glass-panel relative z-[81] w-full max-w-lg rounded-2xl p-5 shadow-lg sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2
                id="revision-reminder-modal-title"
                className="text-lg font-bold text-kal-text"
              >
                New reminder
              </h2>
              <button
                type="button"
                aria-label="Close"
                disabled={saving}
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-kal-muted hover:bg-kal-card-muted hover:text-kal-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 flex rounded-xl border border-kal-border/70 p-0.5">
              <button
                type="button"
                onClick={() => {
                  setSourceTab("custom");
                  setSelectedSyllabusId(null);
                  setSyllabusPickerOpen(false);
                }}
                className={clsx(
                  "min-h-[40px] flex-1 rounded-lg px-3 text-xs font-bold transition-colors sm:text-sm",
                  sourceTab === "custom"
                    ? "bg-kal-accent text-kal-accent-foreground shadow-sm"
                    : "text-kal-muted hover:text-kal-text",
                )}
              >
                Custom topic
              </button>
              <button
                type="button"
                onClick={() => setSourceTab("syllabus")}
                className={clsx(
                  "min-h-[40px] flex-1 rounded-lg px-3 text-xs font-bold transition-colors sm:text-sm",
                  sourceTab === "syllabus"
                    ? "bg-kal-accent text-kal-accent-foreground shadow-sm"
                    : "text-kal-muted hover:text-kal-text",
                )}
              >
                From syllabus
              </button>
            </div>

            {sourceTab === "custom" ? (
              <label className="mb-3 block">
                <span className="text-xs font-medium text-kal-muted">Topic name</span>
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="e.g. Rotational Dynamics — friction edge cases"
                  className="mt-1.5 w-full rounded-xl border border-kal-border bg-kal-card-muted px-3 py-2.5 text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
                />
              </label>
            ) : (
              <div ref={searchWrapRef} className="relative mb-3">
                <label className="block">
                  <span className="text-xs font-medium text-kal-muted">
                    Search syllabus
                  </span>
                  <input
                    type="text"
                    value={syllabusQuery}
                    onChange={(e) => {
                      setSyllabusQuery(e.target.value);
                      setSyllabusPickerOpen(true);
                    }}
                    onFocus={() => setSyllabusPickerOpen(true)}
                    placeholder="Chapter or microtopic…"
                    className="mt-1.5 w-full rounded-xl border border-kal-border bg-kal-card-muted px-3 py-2.5 text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
                  />
                </label>
                {syllabusPickerOpen && filteredSyllabusRows.length > 0 ? (
                  <ul
                    className="absolute z-10 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-kal-border bg-kal-card py-1 shadow-lg"
                    role="listbox"
                  >
                    {filteredSyllabusRows.map((r) => (
                      <li key={String(r.id)} role="none">
                        <button
                          type="button"
                          role="option"
                          className="flex w-full px-3 py-2 text-left text-sm hover:bg-kal-accent-soft/50"
                          onClick={() => pickSyllabusRow(r)}
                        >
                          {formatRowForDisplay(r)}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {selectedSyllabusId ? (
                  <p className="mt-2 text-xs text-kal-muted">
                    Linked to syllabus. Topic name below can be edited.
                  </p>
                ) : null}
                <label className="mt-3 block">
                  <span className="text-xs font-medium text-kal-muted">Topic name</span>
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-kal-border bg-kal-card-muted px-3 py-2.5 text-sm text-kal-text focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
                  />
                </label>
              </div>
            )}

            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-medium text-kal-muted">Due date</span>
                <input
                  type="date"
                  value={nextDue}
                  onChange={(e) => setNextDue(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-kal-border bg-kal-card-muted px-3 py-2.5 text-sm text-kal-text focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-kal-muted">
                  Priority / difficulty
                </span>
                <select
                  value={difficulty}
                  onChange={(e) =>
                    setDifficulty(e.target.value as RevisionDifficulty)
                  }
                  className="mt-1.5 w-full rounded-xl border border-kal-border bg-kal-card-muted px-3 py-2.5 text-sm text-kal-text focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>
            </div>

            <label className="mb-4 block">
              <span className="text-xs font-medium text-kal-muted">Notes (optional)</span>
              <textarea
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                rows={3}
                placeholder="Context, page numbers, mistake patterns…"
                className="mt-1.5 w-full resize-y rounded-xl border border-kal-border bg-kal-card-muted px-3 py-2.5 text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
              />
            </label>

            {formError ? (
              <p className="mb-3 text-sm font-medium text-rose-600 dark:text-rose-400">
                {formError}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={() => setModalOpen(false)}
                className="kal-glass-subtle min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || !userId}
                onClick={() => void onSubmitAdd()}
                className="kal-btn-accent min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save reminder"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteTarget != null}
        title="Delete reminder?"
        description="This removes the reminder from your list. You can add a new one anytime."
        confirmLabel="Delete"
        busy={deleteBusy}
        onCancel={() => !deleteBusy && setDeleteTarget(null)}
        onConfirm={() => {
          if (!userId || !deleteTarget) return;
          setDeleteBusy(true);
          void (async () => {
            try {
              const b = await plannerTextRemoveRevision(userId, deleteTarget.id);
              setItems(b.revisionItems);
            } finally {
              setDeleteBusy(false);
              setDeleteTarget(null);
            }
          })();
        }}
      />
    </div>
  );
}
