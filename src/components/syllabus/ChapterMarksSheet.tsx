"use client";

import { Loader2, SlidersHorizontal, X } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

import { upsertSyllabusMarksOverride } from "@/actions/syllabusMarks";
import type { MergedSyllabusRow } from "@/lib/userSyllabusMerge";

function parseMark(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

type DraftRow = { y25: string; y24: string; y23: string };

type Props = {
  open: boolean;
  onClose: () => void;
  examName: string;
  primaryYear: 2023 | 2024 | 2025;
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
  const baseId = useId();
  const [draft, setDraft] = useState<Record<string, DraftRow>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const next: Record<string, DraftRow> = {};
    for (const r of rows) {
      next[r.id] = {
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
      setErr(e instanceof Error ? e.message : "Could not save weights.");
    } finally {
      setBusy(false);
    }
  }, [rows, draft, examName, onSaved, onClose]);

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
      <div className="relative z-[66] max-h-[min(90dvh,36rem)] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-slate-700 bg-[#0c1220] p-5 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-kal-accent/15 text-kal-accent">
              <SlidersHorizontal className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2
                id={`${baseId}-marks-title`}
                className="text-lg font-bold text-white"
              >
                Chapter marks weights
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">{chapterTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            className="rounded-lg p-2 text-zinc-500 hover:bg-white/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-zinc-500">
          Weights are stored for your account only and never change the shared
          syllabus catalog. Leave a year blank to use the catalog value for
          that year. Multi-year projections use 2025 / 2024 / 2023 columns when
          set.
        </p>
        {primaryYear === 2025 ? (
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

        {err ? (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-rose-500/35 bg-rose-950/40 px-3 py-2 text-xs text-rose-100"
          >
            {err}
          </p>
        ) : null}

        <div className="mt-4 space-y-3">
          {rows.map((r) => {
            const d = draft[r.id] ?? { y25: "", y24: "", y23: "" };
            return (
              <div
                key={r.id}
                className="rounded-xl border border-kal-border bg-kal-card-muted p-3"
              >
                <p className="text-[13px] font-medium leading-snug text-zinc-200">
                  {r.microtopic}
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <label className="block text-[10px] font-medium text-zinc-500">
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
                      className="mt-1 w-full rounded-lg border border-kal-border bg-kal-input-bg px-2 py-2 text-sm text-kal-text tabular-nums placeholder:text-kal-muted"
                      placeholder="—"
                      autoComplete="off"
                    />
                  </label>
                  <label className="block text-[10px] font-medium text-zinc-500">
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
                      className="mt-1 w-full rounded-lg border border-kal-border bg-kal-input-bg px-2 py-2 text-sm text-kal-text tabular-nums placeholder:text-kal-muted"
                      placeholder="—"
                      autoComplete="off"
                    />
                  </label>
                  <label className="block text-[10px] font-medium text-zinc-500">
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
                      className="mt-1 w-full rounded-lg border border-kal-border bg-kal-input-bg px-2 py-2 text-sm text-kal-text tabular-nums placeholder:text-kal-muted"
                      placeholder="—"
                      autoComplete="off"
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl bg-kal-accent py-3 text-sm font-semibold text-white disabled:opacity-50"
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
            className="min-h-[48px] rounded-xl border border-slate-600 px-4 py-3 text-sm font-semibold text-zinc-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
