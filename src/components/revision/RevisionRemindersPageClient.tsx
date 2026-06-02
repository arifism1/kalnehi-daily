"use client";

import { format, parseISO } from "date-fns";
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
import { useCallback, useEffect, useMemo, useState } from "react";

import { APP_DASHBOARD_PATH } from "@/config/appRoutes";

import { ScheduleRevisionReminderDialog } from "@/components/revision/ScheduleRevisionReminderDialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DateFilterNativeInput } from "@/components/ui/DateFilterNativeInput";
import {
  isCustomDateFilter,
  RelativeDatePresetChips,
} from "@/components/ui/RelativeDatePresetChips";
import { SyllabusComingSoon } from "@/components/syllabus/SyllabusComingSoon";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { usePrimaryExamLabel } from "@/hooks/usePrimaryExamLabel";
import { useSyllabusTracker } from "@/hooks/useSyllabusTracker";
import { shouldShowSyllabusComingSoon } from "@/lib/examProfile";
import {
  isRevisionReminderOnOrAfterDate,
  type RevisionDifficulty,
} from "@/lib/engine/revisionSchedule";
import {
  hydrateUserPlannerTextRevisionsFromServer,
  plannerTextMarkRevisionReminderDone,
  plannerTextRemoveRevision,
  plannerTextSetRevisionReminderStatus,
} from "@/lib/userPlannerTextClient";
import { getUserPlannerTextBundleCached } from "@/lib/userPlannerTextLocal";
import type { RevisionQueueEntry } from "@/lib/userPlannerTextTypes";
import { useAuthStore } from "@/store/useAuthStore";

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

const EMPTY_ADD_INITIAL = {
  title: "",
  notes: "",
  microtopicId: null as string | null,
  sourceTab: "custom" as const,
};

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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [donePanelOpen, setDonePanelOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RevisionQueueEntry | null>(
    null,
  );
  const [deleteBusy, setDeleteBusy] = useState(false);

  const addInitial = useMemo(() => EMPTY_ADD_INITIAL, []);

  const refresh = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    const cached = await getUserPlannerTextBundleCached(userId);
    if (cached) {
      setItems(cached.revisionItems);
      setLoading(false);
    } else {
      setLoading(true);
    }
    try {
      const bundle = await hydrateUserPlannerTextRevisionsFromServer(userId);
      setItems(bundle.revisionItems);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
    setSelectedDate(null);
  }, [showArchived]);

  const baseFiltered = useMemo(
    () =>
      items.filter(
        (r) =>
          (showArchived || r.status !== "archived") &&
          isRevisionReminderOnOrAfterDate(r, today),
      ),
    [items, showArchived, today],
  );

  const activeItems = useMemo(
    () =>
      baseFiltered
        .filter((r) => r.status === "pending")
        .sort((a, b) => a.nextDue.localeCompare(b.nextDue)),
    [baseFiltered],
  );

  const doneItems = useMemo(
    () =>
      baseFiltered
        .filter((r) => r.status === "done")
        .sort((a, b) => {
          const la = a.lastReviewed ?? "";
          const lb = b.lastReviewed ?? "";
          if (la !== lb) return lb.localeCompare(la);
          const d = b.nextDue.localeCompare(a.nextDue);
          if (d !== 0) return d;
          return b.id.localeCompare(a.id);
        }),
    [baseFiltered],
  );

  const archivedItems = useMemo(
    () =>
      baseFiltered
        .filter((r) => r.status === "archived")
        .sort((a, b) => a.nextDue.localeCompare(b.nextDue)),
    [baseFiltered],
  );

  const dateItemCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of activeItems) {
      m.set(it.nextDue, (m.get(it.nextDue) ?? 0) + 1);
    }
    return m;
  }, [activeItems]);

  const dateFilteredActive = useMemo(() => {
    if (!selectedDate) return activeItems;
    return activeItems.filter((it) => it.nextDue === selectedDate);
  }, [activeItems, selectedDate]);

  const dateFilteredArchived = useMemo(() => {
    if (!selectedDate) return archivedItems;
    return archivedItems.filter((it) => it.nextDue === selectedDate);
  }, [archivedItems, selectedDate]);

  const activeGrouped = useMemo(() => {
    if (selectedDate !== null) return null;
    const map = new Map<string, RevisionQueueEntry[]>();
    for (const it of dateFilteredActive) {
      const list = map.get(it.nextDue) ?? [];
      list.push(it);
      map.set(it.nextDue, list);
    }
    return [...map.entries()]
      .toSorted(([a], [b]) => b.localeCompare(a))
      .map(([date, groupItems]) => ({ date, items: groupItems }));
  }, [dateFilteredActive, selectedDate]);

  const doneGroupedPanel = useMemo(() => {
    const map = new Map<string, RevisionQueueEntry[]>();
    for (const it of doneItems) {
      const list = map.get(it.nextDue) ?? [];
      list.push(it);
      map.set(it.nextDue, list);
    }
    return [...map.entries()]
      .toSorted(([a], [b]) => b.localeCompare(a))
      .map(([date, groupItems]) => ({ date, items: groupItems }));
  }, [doneItems]);

  const archivedGrouped = useMemo(() => {
    if (selectedDate !== null) return null;
    const map = new Map<string, RevisionQueueEntry[]>();
    for (const it of dateFilteredArchived) {
      const list = map.get(it.nextDue) ?? [];
      list.push(it);
      map.set(it.nextDue, list);
    }
    return [...map.entries()]
      .toSorted(([a], [b]) => b.localeCompare(a))
      .map(([date, groupItems]) => ({ date, items: groupItems }));
  }, [dateFilteredArchived, selectedDate]);

  const revisionPickerBounds = useMemo(() => {
    const keys = new Set<string>();
    for (const k of dateItemCounts.keys()) keys.add(k);
    for (const it of doneItems) keys.add(it.nextDue);
    for (const it of archivedItems) keys.add(it.nextDue);
    if (keys.size === 0) return null;
    const sorted = [...keys].toSorted((a, b) => a.localeCompare(b));
    return {
      min: today,
      max: sorted[sorted.length - 1]!,
    };
  }, [dateItemCounts, doneItems, archivedItems, today]);

  const hasAnythingForSelectedDate =
    dateFilteredActive.length > 0 || dateFilteredArchived.length > 0;

  const renderRevisionItem = (it: RevisionQueueEntry, metaGrouped: boolean) => (
    <li
      key={it.id}
      className="kal-glass-card rounded-xl border border-kal-border/50 px-4 py-3.5"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug text-kal-text">{it.title}</p>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-kal-muted">
            {!metaGrouped ? (
              <span>
                Due{" "}
                <span className="font-medium tabular-nums text-kal-text-secondary">
                  {it.nextDue}
                </span>
              </span>
            ) : null}
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
              <Check className="mr-1 inline size-3" aria-hidden />
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
              <Archive className="mr-1 inline size-3" aria-hidden />
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
            <Trash2 className="mr-1 inline size-3" aria-hidden />
            Delete
          </button>
        </div>
      </div>
    </li>
  );

  return (
    <div className="relative mx-auto max-w-2xl pb-20 pt-2 sm:pt-4">
      <div
        className="pointer-events-none absolute -right-20 -top-8 size-48 rounded-full bg-kal-accent/8 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 -left-16 size-40 rounded-full bg-kal-accent/5 blur-3xl"
        aria-hidden
      />

      <Link
        href={APP_DASHBOARD_PATH}
        className="relative mb-6 inline-flex text-sm font-semibold text-kal-accent transition-colors hover:text-kal-accent-hover"
      >
        ← Back
      </Link>

      <header className="relative mb-8">
        <p className="kal-category-label text-kal-accent">Study tools</p>
        <h1 className="kal-feature-title mt-2 flex items-center gap-2.5">
          <AlarmClock className="size-7 shrink-0 text-kal-accent/90" aria-hidden />
          Revision Tracker
        </h1>
        <p className="kal-feature-lead mt-3 max-w-xl">
          Today and upcoming due dates only — past-due items live under Missed
          Tasks. Tap <span className="font-semibold text-kal-text">Done</span> next
          to Add to see entries you&apos;ve completed. Your list is what you add;
          nothing is dropped into your daily plan automatically.
        </p>
      </header>

      {!userId ? (
        <div className="kal-glass-card rounded-2xl border border-kal-border/60 p-6 text-sm text-kal-muted">
          Sign in to save and sync Revision Tracker across devices.
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
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setDonePanelOpen(true)}
            disabled={!userId}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-kal-border/70 bg-kal-card-muted px-3 py-2.5 text-sm font-semibold text-kal-text hover:bg-kal-accent-soft/40 disabled:pointer-events-none disabled:opacity-50"
          >
            <Check className="size-4 shrink-0 opacity-90" aria-hidden />
            Done
            <span className="tabular-nums text-kal-muted">({doneItems.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            disabled={!userId}
            className="kal-btn-accent inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:pointer-events-none disabled:opacity-50"
          >
            <Plus className="size-4" aria-hidden />
            Add revision
          </button>
        </div>
      </div>

      {!loading && baseFiltered.length > 0 ? (
        <div className="relative mb-4 flex flex-wrap items-center gap-2">
          <RelativeDatePresetChips
            todayYmd={today}
            totalAll={activeItems.length}
            countByDate={dateItemCounts}
            selectedDate={selectedDate}
            onSelect={setSelectedDate}
          />
          {revisionPickerBounds ? (
            <DateFilterNativeInput
              min={revisionPickerBounds.min}
              max={revisionPickerBounds.max}
              onSelect={setSelectedDate}
              active={isCustomDateFilter(selectedDate, today)}
            />
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-kal-accent/50" aria-label="Loading" />
        </div>
      ) : baseFiltered.length === 0 ? (
        <div className="kal-glass-card rounded-2xl border border-kal-border/50 p-8 text-center">
          <p className="text-sm text-kal-muted">
            No items due today or later. Add one for a future date, or check
            Missed Tasks if something was due before today.
          </p>
        </div>
      ) : !hasAnythingForSelectedDate && selectedDate != null ? (
        <div className="kal-glass-card rounded-2xl border border-kal-border/50 p-6 text-center">
          <p className="text-sm text-kal-text-secondary">
            Nothing on this date.{" "}
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="font-semibold text-kal-accent underline underline-offset-2 hover:text-kal-accent-hover"
            >
              Show all dates
            </button>
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          <div className="space-y-6">
            {dateFilteredActive.length === 0 &&
            dateFilteredArchived.length > 0 ? (
              <p className="text-sm text-kal-muted">
                {selectedDate != null
                  ? "No pending items on this date."
                  : "No pending items in this view."}
              </p>
            ) : dateFilteredActive.length === 0 &&
              dateFilteredArchived.length === 0 &&
              doneItems.length > 0 ? (
              <p className="text-sm text-kal-muted">
                {selectedDate != null
                  ? "No pending items on this date. Tap Done to see completed items."
                  : "Tap Done to see completed items."}
              </p>
            ) : null}
            {selectedDate === null ? (
              (activeGrouped ?? []).length > 0 ? (
                <div className="space-y-6">
                  {(activeGrouped ?? []).map(({ date, items: groupItems }) => (
                    <section key={date} className="space-y-2.5">
                      <h3 className="border-b border-kal-border/50 pb-1.5 text-xs font-semibold uppercase tracking-wide text-kal-accent">
                        {format(parseISO(date), "EEEE, MMM d, yyyy")}
                      </h3>
                      <ul className="space-y-2.5">
                        {groupItems.map((it) => renderRevisionItem(it, true))}
                      </ul>
                    </section>
                  ))}
                </div>
              ) : null
            ) : dateFilteredActive.length > 0 ? (
              <ul className="space-y-2.5">
                {dateFilteredActive.map((it) => renderRevisionItem(it, false))}
              </ul>
            ) : null}
          </div>

          {dateFilteredArchived.length > 0 ? (
            <section
              className="space-y-4"
              aria-labelledby="revision-archived-heading"
            >
              <h2
                id="revision-archived-heading"
                className="border-b border-kal-border/50 pb-1.5 text-xs font-semibold uppercase tracking-wide text-kal-text-secondary"
              >
                Archived
              </h2>
              {selectedDate === null ? (
                <div className="space-y-6">
                  {(archivedGrouped ?? []).map(({ date, items: groupItems }) => (
                    <section key={date} className="space-y-2.5">
                      <h3 className="border-b border-kal-border/50 pb-1.5 text-xs font-semibold uppercase tracking-wide text-kal-accent">
                        {format(parseISO(date), "EEEE, MMM d, yyyy")}
                      </h3>
                      <ul className="space-y-2.5">
                        {groupItems.map((it) => renderRevisionItem(it, true))}
                      </ul>
                    </section>
                  ))}
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {dateFilteredArchived.map((it) =>
                    renderRevisionItem(it, false),
                  )}
                </ul>
              )}
            </section>
          ) : null}
        </div>
      )}

      {donePanelOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto overflow-x-hidden p-4 [padding-bottom:max(1rem,env(safe-area-inset-bottom,0px))] [padding-top:max(1rem,env(safe-area-inset-top,0px))]"
          role="presentation"
        >
          <button
            type="button"
            aria-label="Close"
            className="fixed inset-0 bg-kal-overlay backdrop-blur-sm"
            onClick={() => setDonePanelOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="revision-done-panel-title"
            className="kal-glass-panel relative z-[81] my-auto flex min-h-0 w-full max-w-lg max-h-[min(92dvh,100dvh-2rem)] flex-col overflow-hidden rounded-2xl shadow-lg sm:max-h-[min(90dvh,85dvh)]"
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-kal-border/50 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
              <h2
                id="revision-done-panel-title"
                className="text-lg font-semibold text-kal-text"
              >
                Completed items
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setDonePanelOpen(false)}
                className="rounded-lg p-1 text-kal-muted hover:bg-kal-card-muted hover:text-kal-text"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-5 py-4 sm:px-6 [-webkit-overflow-scrolling:touch]">
              {doneItems.length === 0 ? (
                <p className="text-sm text-kal-muted">
                  No completed items yet.
                </p>
              ) : (
                <div className="space-y-6">
                  {doneGroupedPanel.map(({ date, items: groupItems }) => (
                    <section key={date} className="space-y-2.5">
                      <h3 className="border-b border-kal-border/50 pb-1.5 text-xs font-semibold uppercase tracking-wide text-kal-accent">
                        {format(parseISO(date), "EEEE, MMM d, yyyy")}
                      </h3>
                      <ul className="space-y-2.5">
                        {groupItems.map((it) => renderRevisionItem(it, true))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <ScheduleRevisionReminderDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        userId={userId}
        showVoice
        dialogTitle="Add revision"
        titleId="revision-reminder-modal-title"
        initial={addInitial}
        onSaved={(bundle) => setItems(bundle.revisionItems)}
      />

      <ConfirmDialog
        open={deleteTarget != null}
        title="Remove from tracker?"
        description="This removes the item from Revision Tracker. You can add a new one anytime."
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
