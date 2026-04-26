"use client";

import { format, parseISO } from "date-fns";
import Link from "next/link";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useExamsCatalogRows } from "@/hooks/useExamsCatalogRows";
import { chapterKey } from "@/lib/syllabusGrouping";
import { displayNameForExamCatalog } from "@/lib/examsCatalog";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { toUserFacingMessage } from "@/lib/userFacingErrors";
import type { Tables } from "@/types/supabase";
import { useAuthStore } from "@/store/useAuthStore";

type BlueprintRow = Tables<"user_target_blueprints">;

type ChapterJson = {
  subject?: string;
  chapter?: string;
  chapterMarksTotal?: number;
  microtopicProgressPercent?: number;
};

function parseChapters(raw: unknown): ChapterJson[] {
  if (!Array.isArray(raw)) return [];
  return raw as ChapterJson[];
}

export function MyTargetClient() {
  const user = useAuthStore((s) => s.user);
  const { rows: catalogRows } = useExamsCatalogRows();
  const [list, setList] = useState<BlueprintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeExamTab, setActiveExamTab] = useState<string>("__all__");

  const load = useCallback(async () => {
    if (!user?.id) {
      setList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: qErr } = await supabase
        .from("user_target_blueprints")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (qErr) throw qErr;
      setList((data ?? []) as BlueprintRow[]);
    } catch (e) {
      setError(toUserFacingMessage(e));
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const onDelete = useCallback(
    async (id: string) => {
      if (!user?.id) return;
      setDeletingId(id);
      try {
        const supabase = getSupabaseBrowserClient();
        const { error: delErr } = await supabase
          .from("user_target_blueprints")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);
        if (delErr) throw delErr;
        setList((prev) => prev.filter((r) => r.id !== id));
      } catch (e) {
        setError(toUserFacingMessage(e));
      } finally {
        setDeletingId(null);
      }
    },
    [user?.id],
  );

  const examLabel = useCallback(
    (examName: string) => displayNameForExamCatalog(examName, catalogRows),
    [catalogRows],
  );

  const emptyMessage = useMemo(
    () =>
      "Nothing saved yet. Generate a blueprint on Target Score Blueprint and tap “Save to My Target”.",
    [],
  );

  // Distinct exam names present in the user's saved blueprints
  const examTabOptions = useMemo(() => {
    const seen = new Set<string>();
    const out: { examName: string; displayName: string }[] = [];
    for (const row of list) {
      if (!row.exam_name || seen.has(row.exam_name)) continue;
      seen.add(row.exam_name);
      out.push({
        examName: row.exam_name,
        displayName: displayNameForExamCatalog(row.exam_name, catalogRows) || row.exam_name,
      });
    }
    return out;
  }, [list, catalogRows]);

  const isMultiExam = examTabOptions.length > 1;

  const visibleList = useMemo(() => {
    if (!isMultiExam || activeExamTab === "__all__") return list;
    return list.filter((r) => r.exam_name === activeExamTab);
  }, [list, isMultiExam, activeExamTab]);

  if (!user) {
    return (
      <p className="mx-auto max-w-lg rounded-xl border border-kal-warn-border bg-kal-warn-soft px-4 py-3 text-sm text-kal-warn-text">
        Sign in to view My Target.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16 pt-2 sm:pt-4">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-kal-accent hover:text-kal-accent-hover"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Home
      </Link>

      <header className="space-y-2">
        <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-kal-accent">
          Saved blueprints
        </p>
        <h1 className="kal-feature-title">My Target</h1>
        <p className="max-w-2xl text-sm text-kal-muted">
          Lists you saved from Target Score Blueprint, with the date each was added.
        </p>
        <p>
          <Link
            href="/target-score-blueprint"
            className="text-sm font-semibold text-kal-accent underline-offset-4 hover:underline"
          >
            Open Target Score Blueprint
          </Link>
        </p>
      </header>

      {error ? (
        <p className="rounded-xl border border-kal-accent/40 bg-kal-accent-soft/40 px-4 py-3 text-sm text-kal-text">
          {error}
        </p>
      ) : null}

      {/* Exam tabs — only shown when blueprints exist for 2+ exams */}
      {!loading && isMultiExam && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by exam">
          <button
            role="tab"
            aria-selected={activeExamTab === "__all__"}
            onClick={() => setActiveExamTab("__all__")}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
              activeExamTab === "__all__"
                ? "border-kal-accent bg-kal-accent text-kal-accent-foreground shadow-sm"
                : "border-kal-border bg-kal-card/40 text-kal-muted hover:border-kal-accent/50 hover:text-kal-text"
            }`}
          >
            All exams
          </button>
          {examTabOptions.map((opt) => (
            <button
              key={opt.examName}
              role="tab"
              aria-selected={activeExamTab === opt.examName}
              onClick={() => setActiveExamTab(opt.examName)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                activeExamTab === opt.examName
                  ? "border-kal-accent bg-kal-accent text-kal-accent-foreground shadow-sm"
                  : "border-kal-border bg-kal-card/40 text-kal-muted hover:border-kal-accent/50 hover:text-kal-text"
              }`}
            >
              {opt.displayName}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-kal-muted">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          Loading…
        </div>
      ) : visibleList.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-kal-border bg-kal-card-muted/40 px-6 py-10 text-center text-sm text-kal-muted">
          {activeExamTab === "__all__"
            ? emptyMessage
            : "No blueprints saved for this exam yet."}
        </p>
      ) : (
        <ul className="space-y-6">
          {visibleList.map((row) => {
            const chapters = parseChapters(row.chapters);
            const dateAdded = (() => {
              try {
                return format(parseISO(row.created_at), "d MMM yyyy");
              } catch {
                return row.created_at;
              }
            })();
            const modeLabel =
              row.mode === "gain"
                ? "Gain to reach band"
                : "Total target (absolute band)";
            return (
              <li
                key={row.id}
                className="kal-glass-panel overflow-hidden rounded-2xl border border-kal-border"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-kal-border bg-kal-card-muted/40 px-4 py-4 sm:px-5">
                  <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-kal-muted">
                      Added on
                    </p>
                    <p className="text-lg font-semibold tabular-nums text-kal-text">{dateAdded}</p>
                    <p className="mt-2 text-sm text-kal-text">
                      <span className="text-kal-muted">Exam: </span>
                      {examLabel(row.exam_name) || row.exam_name}
                    </p>
                    <p className="mt-1 text-sm text-kal-muted">
                      Target band {row.range_low}–{row.range_high} / {row.max_score} max ·{" "}
                      {modeLabel}
                    </p>
                    <p className="mt-1 text-xs text-kal-muted">
                      Estimated ~{row.estimated_marks_at_save} marks at save · Covered{" "}
                      {row.total_marks_covered} chapter-weight units
                    </p>
                  </div>
                  <button
                    type="button"
                    title="Remove this saved list"
                    disabled={deletingId === row.id}
                    onClick={() => void onDelete(row.id)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-kal-border px-3 py-2 text-xs font-semibold text-kal-muted hover:border-kal-accent/50 hover:text-kal-accent disabled:opacity-50"
                  >
                    {deletingId === row.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Trash2 className="h-4 w-4" aria-hidden />
                    )}
                    Delete
                  </button>
                </div>
                {chapters.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[28rem] text-left text-sm">
                      <thead>
                        <tr className="border-b border-kal-border bg-kal-card-muted/30 text-[0.65rem] font-semibold uppercase tracking-wide text-kal-muted">
                          <th className="px-4 py-3 sm:px-5">Subject</th>
                          <th className="px-4 py-3 sm:px-5">Chapter</th>
                          <th className="px-4 py-3 sm:px-5">Approx. marks</th>
                          <th className="px-4 py-3 sm:px-5">Your current mastery</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chapters.map((ch, idx) => (
                          <tr
                            key={`${row.id}-${chapterKey(ch.subject ?? "", ch.chapter ?? "")}-${idx}`}
                            className="border-b border-kal-border/80 last:border-0"
                          >
                            <td className="px-4 py-3 align-top font-medium text-kal-text sm:px-5">
                              {ch.subject ?? "—"}
                            </td>
                            <td className="px-4 py-3 align-top text-kal-text sm:px-5">
                              {ch.chapter ?? "—"}
                            </td>
                            <td className="px-4 py-3 align-top tabular-nums sm:px-5">
                              {typeof ch.chapterMarksTotal === "number"
                                ? ch.chapterMarksTotal.toFixed(0)
                                : "—"}
                            </td>
                            <td className="px-4 py-3 align-top tabular-nums text-kal-muted sm:px-5">
                              {typeof ch.microtopicProgressPercent === "number"
                                ? ch.microtopicProgressPercent % 1 === 0
                                  ? `${ch.microtopicProgressPercent.toFixed(0)}%`
                                  : `${ch.microtopicProgressPercent.toFixed(1)}%`
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="px-4 py-6 text-center text-sm text-kal-muted sm:px-5">
                    No chapter rows stored for this entry.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
