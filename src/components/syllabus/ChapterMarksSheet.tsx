"use client";

import { Loader2, SlidersHorizontal, X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

import { upsertSyllabusMarksOverride } from "@/actions/syllabusMarks";
import { type PrimaryMarksYear, isNeetUgExam } from "@/lib/examProfile";
import { surfaceErrorForUi } from "@/lib/userFacingErrors";
import type { MergedSyllabusRow } from "@/lib/userSyllabusMerge";

function parseMark(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

type DraftRow = { y26: string; y25: string; y24: string; y23: string };

type Props = {
  open: boolean;
  onClose: () => void;
  examName: string;
  primaryYear: PrimaryMarksYear;
  chapterTitle: string;
  rows: MergedSyllabusRow[];
  onSaved: () => void;
};

export function ChapterMarksSheet({
  open,
  onClose,
  examName,
  primaryYear,
  chapterTitle,
  rows,
  onSaved,
}: Props) {
  const hide2026Marks = isNeetUgExam(examName);
  const baseId = useId();
  const [draft, setDraft] = useState<Record<string, DraftRow>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const next: Record<string, DraftRow> = {};
    for (const r of rows) {
      next[r.id] = {
        y26: r.marks_2026 != null ? String(r.marks_2026) : "",
        y25: r.marks_2025 != null ? String(r.marks_2025) : "",
        y24: r.marks_2024 != null ? String(r.marks_2024) : "",
        y23: r.marks_2023 != null ? String(r.marks_2023) : "",
      };
    }
    setDraft(next);
    setErr(null);
  }, [open, rows]);

  const save = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      await Promise.all(
        rows.map(async (r) => {
          const d = draft[r.id];
          if (!d) return;
          const res = await upsertSyllabusMarksOverride({
            examName,
            syllabusMasterId: r.id,
            marks_2026: hide2026Marks ? null : parseMark(d.y26),
            marks_2025: parseMark(d.y25),
            marks_2024: parseMark(d.y24),
            marks_2023: parseMark(d.y23),
          });
          if (!res.ok) throw new Error(res.error);
        }),
      );
      onSaved();
      onClose();
    } catch (e) {
      setErr(surfaceErrorForUi(e));
    } finally {
      setBusy(false);
    }
  }, [rows, draft, examName, onSaved, onClose, hide2026Marks]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[65] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${baseId}-marks-title`}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/65"
        onClick={() => !busy && onClose()}
      />
      <div className="kal-glass-panel relative z-[66] flex min-h-0 w-full max-w-lg max-h-[min(90dvh,36rem)] flex-col overflow-hidden rounded-t-3xl shadow-2xl sm:rounded-3xl">
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-kal-border/50 px-5 pb-3 pt-5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-kal-accent/15 text-kal-accent">
              <SlidersHorizontal className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2
                id={`${baseId}-marks-title`}
                className="text-lg font-bold text-kal-text"
              >
                Chapter marks weights
              </h2>
              <p className="mt-0.5 text-xs text-kal-muted">{chapterTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            className="rounded-lg p-2 text-kal-muted hover:bg-kal-card-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-5 py-3 [-webkit-overflow-scrolling:touch]">
        <p className="text-xs leading-relaxed text-kal-muted">
          Weights are stored for your account only and never change the shared
          syllabus catalog. Leave a year blank to use the catalog value for
          that year. Multi-year projections use{" "}
          {hide2026Marks
            ? "2025 / 2024 / 2023 columns when set."
            : "2026 / 2025 / 2024 / 2023 columns when set."}
        </p>
        {primaryYear === 2026 ? (
          <p className="mt-1 text-[11px] font-medium text-kal-accent/90">
            Primary pool for this exam uses marks_2026.
          </p>
        ) : primaryYear === 2025 ? (
          <p className="mt-1 text-[11px] font-medium text-kal-accent/90">
            Primary pool for this exam uses marks_2025.
          </p>
        ) : primaryYear === 2024 ? (
          <p className="mt-1 text-[11px] font-medium text-kal-accent/90">
            Primary pool for this exam uses marks_2024.
          </p>
        ) : (
          <p className="mt-1 text-[11px] font-medium text-kal-accent/90">
            Primary pool for this exam uses marks_2023.
          </p>
        )}

        <div className="mt-4 space-y-3">
          {rows.map((r) => {
            const d = draft[r.id] ?? { y26: "", y25: "", y24: "", y23: "" };
            return (
              <div
                key={r.id}
                className="kal-glass-subtle rounded-xl p-3"
              >
                <p className="text-[13px] font-medium leading-snug text-kal-text">
                  {r.microtopic}
                </p>
                <div
                  className={
                    hide2026Marks
                      ? "mt-2 grid grid-cols-3 gap-2"
                      : "mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4"
                  }
                >
                  {!hide2026Marks ? (
                  <label className="block text-[10px] font-medium text-kal-muted">
                    2026
                    <input
                      type="text"
                      inputMode="decimal"
                      value={d.y26}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          [r.id]: { ...d, y26: e.target.value },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-kal-border bg-kal-input-bg px-2 py-2 text-base sm:text-sm text-kal-text tabular-nums placeholder:text-kal-muted"
                      placeholder="—"
                      autoComplete="off"
                    />
                  </label>
                  ) : null}
                  <label className="block text-[10px] font-medium text-kal-muted">
                    2025
                    <input
                      type="text"
                      inputMode="decimal"
                      value={d.y25}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          [r.id]: { ...d, y25: e.target.value },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-kal-border bg-kal-input-bg px-2 py-2 text-base sm:text-sm text-kal-text tabular-nums placeholder:text-kal-muted"
                      placeholder="—"
                      autoComplete="off"
                    />
                  </label>
                  <label className="block text-[10px] font-medium text-kal-muted">
                    2024
                    <input
                      type="text"
                      inputMode="decimal"
                      value={d.y24}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          [r.id]: { ...d, y24: e.target.value },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-kal-border bg-kal-input-bg px-2 py-2 text-base sm:text-sm text-kal-text tabular-nums placeholder:text-kal-muted"
                      placeholder="—"
                      autoComplete="off"
                    />
                  </label>
                  <label className="block text-[10px] font-medium text-kal-muted">
                    2023
                    <input
                      type="text"
                      inputMode="decimal"
                      value={d.y23}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          [r.id]: { ...d, y23: e.target.value },
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-kal-border bg-kal-input-bg px-2 py-2 text-base sm:text-sm text-kal-text tabular-nums placeholder:text-kal-muted"
                      placeholder="—"
                      autoComplete="off"
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
        </div>

        <div className="shrink-0 border-t border-kal-border/50 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        {err ? (
          <p
            role="alert"
            className="mb-3 rounded-lg border border-orange-500/35 bg-orange-950/40 px-3 py-2 text-xs text-orange-100"
          >
            {err}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="kal-btn-accent flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              "Save weights"
            )}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onClose()}
            className="kal-btn-ghost min-h-[48px] rounded-xl px-4 py-3 text-sm font-semibold"
          >
            Cancel
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
