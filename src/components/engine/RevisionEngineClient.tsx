"use client";

import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useCalendarDate } from "@/hooks/useCalendarDate";
import { usePrimaryExamLabel } from "@/hooks/usePrimaryExamLabel";
import { useSyllabusTracker } from "@/hooks/useSyllabusTracker";
import { SyllabusComingSoon } from "@/components/syllabus/SyllabusComingSoon";
import { shouldShowSyllabusComingSoon } from "@/lib/examProfile";
import {
  dueAndUpcoming,
  type RevisionDifficulty,
  type RevisionItem,
} from "@/lib/engine/revisionSchedule";
import {
  hydrateUserPlannerTextFromServer,
  plannerTextAppendRevision,
  plannerTextCompleteRevision,
  plannerTextRemoveRevision,
} from "@/lib/userPlannerTextClient";
import { getUserPlannerTextBundleCached } from "@/lib/userPlannerTextLocal";
import { useAuthStore } from "@/store/useAuthStore";

import { EngineCard, EngineHero } from "./EngineHero";

const DIFF_LABEL: Record<RevisionDifficulty, string> = {
  hard: "Hard (+1 day)",
  medium: "Medium (+3 days)",
  easy: "Easy (+7 days)",
};

export function RevisionEngineClient() {
  const today = useCalendarDate();
  const userId = useAuthStore((s) => s.user?.id);
  const { examLabel, loading: examLoading } = usePrimaryExamLabel();
  const { rows, cuetAwaitingDomainSelection, loading, error } =
    useSyllabusTracker();
  const syllabusSoon = shouldShowSyllabusComingSoon({
    examLabel,
    examLabelLoading: examLoading,
    syllabusLoading: loading,
    syllabusError: error,
    syllabusRowCount: rows.length,
    cuetAwaitingDomainSelection,
  });

  const [items, setItems] = useState<RevisionItem[]>([]);
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<RevisionDifficulty>("medium");

  const refresh = useCallback(async () => {
    if (!userId) {
      setItems([]);
      return;
    }
    const bundle = await hydrateUserPlannerTextFromServer(userId);
    setItems(bundle.revisionItems);
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
  }, [refresh, userId]);

  const { due, upcoming } = useMemo(
    () => dueAndUpcoming(items, today),
    [items, today],
  );

  const onAdd = async () => {
    if (!userId) return;
    const bundle = await plannerTextAppendRevision(
      userId,
      title,
      difficulty,
    );
    setItems(bundle.revisionItems);
    setTitle("");
  };

  return (
    <div className="space-y-6">
      <EngineHero
        eyebrow="Spaced repetition"
        title="Revision Engine"
        description="High-yield revision cadence: Hard → next in 1 day, Medium → 3 days, Easy → 7 days. We suggest tasks — you stay in control."
      />

      {syllabusSoon && examLabel ? (
        <SyllabusComingSoon variant="compact" examLabel={examLabel} />
      ) : null}

      {!userId ? (
        <EngineCard title="Sign in to sync">
          <p className="text-sm text-zinc-500">
            Sign in to save your revision queue across devices. You can still
            browse the syllabus above.
          </p>
        </EngineCard>
      ) : null}

      <EngineCard title="Queue a revision">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-xs font-medium text-kal-muted">
            Topic / note
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Rotational mechanics — friction edge cases"
              disabled={!userId}
              className="mt-1.5 w-full rounded-xl border border-kal-border bg-kal-input-bg px-3 py-2.5 text-sm text-kal-text outline-none placeholder:text-kal-muted focus-visible:ring-2 focus-visible:ring-kal-accent/35 disabled:opacity-50"
            />
          </label>
          <label className="text-xs font-medium text-kal-muted sm:w-48">
            Difficulty
            <select
              value={difficulty}
              disabled={!userId}
              onChange={(e) =>
                setDifficulty(e.target.value as RevisionDifficulty)
              }
              className="mt-1.5 w-full rounded-xl border border-kal-border bg-kal-input-bg px-3 py-2.5 text-sm text-kal-text outline-none focus-visible:ring-2 focus-visible:ring-kal-accent/35 disabled:opacity-50"
            >
              {(Object.keys(DIFF_LABEL) as RevisionDifficulty[]).map((k) => (
                <option key={k} value={k}>
                  {DIFF_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void onAdd()}
            disabled={!userId}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-kal-accent px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </EngineCard>

      <EngineCard title="Due now">
        {due.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Nothing due — add topics or clear your backlog to stay sharp.
          </p>
        ) : (
          <ul className="space-y-3">
            {due.map((it) => (
              <li
                key={it.id}
                className="flex flex-col gap-2 rounded-xl border border-kal-accent/25 bg-red-950/15 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-white">{it.title}</p>
                  <p className="text-xs text-zinc-500">
                    Due {it.nextDue} · {DIFF_LABEL[it.difficulty]}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!userId) return;
                      void plannerTextCompleteRevision(
                        userId,
                        it.id,
                        today,
                      ).then((b) => setItems(b.revisionItems));
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-kal-accent px-3 py-2 text-xs font-semibold text-white"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Logged review
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!userId) return;
                      void plannerTextRemoveRevision(userId, it.id).then((b) =>
                        setItems(b.revisionItems),
                      );
                    }}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-600 p-2 text-zinc-400 hover:text-rose-300"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </EngineCard>

      <EngineCard title="Upcoming">
        {upcoming.length === 0 ? (
          <p className="text-sm text-zinc-500">No upcoming slots.</p>
        ) : (
          <ul className="space-y-2 text-sm text-zinc-300">
            {upcoming.map((it) => (
              <li
                key={it.id}
                className="flex justify-between gap-2 border-b border-white/[0.04] py-2 last:border-0"
              >
                <span className="min-w-0">{it.title}</span>
                <span className="shrink-0 text-xs text-zinc-500">
                  {it.nextDue}
                </span>
              </li>
            ))}
          </ul>
        )}
      </EngineCard>

      <p className="text-center text-[11px] text-zinc-600">
        {userId
          ? "Revision queue syncs when you are online — edits stay available offline."
          : "Sign in to sync your revision queue across devices."}
      </p>
    </div>
  );
}
