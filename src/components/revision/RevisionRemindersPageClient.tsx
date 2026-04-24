"use client";

import { format, parseISO } from "date-fns";
import {
  AlarmClock,
  Archive,
  Check,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

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

  const dateItemCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of sortedItems) {
      m.set(it.nextDue, (m.get(it.nextDue) ?? 0) + 1);
    }
    return m;
  }, [sortedItems]);

  const dateFilteredItems = useMemo(() => {
    if (!selectedDate) return sortedItems;
    return sortedItems.filter((it) => it.nextDue === selectedDate);
  }, [sortedItems, selectedDate]);

  const revisionItemsGrouped = useMemo(() => {
    if (selectedDate !== null) return null;
    const map = new Map<string, RevisionQueueEntry[]>();
    for (const it of dateFilteredItems) {
      const list = map.get(it.nextDue) ?? [];
      list.push(it);
      map.set(it.nextDue, list);
    }
    return [...map.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({ date, items }));
  }, [dateFilteredItems, selectedDate]);

  const revisionPickerBounds = useMemo(() => {
    const keys = [...dateItemCounts.keys()].sort((a, b) => a.localeCompare(b));
    if (keys.length === 0) return null;
    return {
      min: today,
      max: keys[keys.length - 1]!,
    };
  }, [dateItemCounts, today]);

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
  );

  return (
    <div className="relative mx-auto max-w-2xl pb-20 pt-2 sm:pt-4">
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
          onClick={() => setModalOpen(true)}
          disabled={!userId}
          className="kal-btn-accent inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:pointer-events-none disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add New Reminder
        </button>
      </div>

      {!loading && sortedItems.length > 0 ? (
        <div className="relative mb-4 flex flex-wrap items-center gap-2">
          <RelativeDatePresetChips
            todayYmd={today}
            totalAll={sortedItems.length}
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
          <Loader2 className="h-8 w-8 animate-spin text-kal-accent/50" aria-label="Loading" />
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="kal-glass-card rounded-2xl border border-kal-border/50 p-8 text-center">
          <p className="text-sm text-kal-muted">
            No reminders due today or later. Add one for a future date, or check
            Missed Tasks if something was due before today.
          </p>
        </div>
      ) : dateFilteredItems.length === 0 && selectedDate != null ? (
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
      ) : selectedDate === null ? (
        <div className="space-y-6">
          {(revisionItemsGrouped ?? []).map(({ date, items }) => (
            <section key={date} className="space-y-2.5">
              <h3 className="border-b border-kal-border/50 pb-1.5 text-xs font-bold uppercase tracking-wide text-kal-accent">
                {format(parseISO(date), "EEEE, MMM d, yyyy")}
              </h3>
              <ul className="space-y-2.5">
                {items.map((it) => renderRevisionItem(it, true))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <ul className="space-y-2.5">
          {dateFilteredItems.map((it) => renderRevisionItem(it, false))}
        </ul>
      )}

      <ScheduleRevisionReminderDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        userId={userId}
        showVoice
        dialogTitle="New reminder"
        titleId="revision-reminder-modal-title"
        initial={addInitial}
        onSaved={(bundle) => setItems(bundle.revisionItems)}
      />

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
