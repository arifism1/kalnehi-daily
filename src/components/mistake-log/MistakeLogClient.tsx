"use client";

import clsx from "clsx";
import {
  BookmarkCheck,
  Filter,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  getMistakeLogs,
  deleteMistakeLog,
  updateMistakeLog,
  type MistakeLogRow,
  type MistakeType,
} from "@/actions/mistakeLogs";
import { AddMistakeSheet } from "@/components/mistake-log/AddMistakeSheet";
import { MISTAKE_TYPES } from "@/components/mistake-log/MistakeTypeButton";
import { useDoubtSyllabusSubjects } from "@/hooks/useDoubtSyllabusSubjects";

const RANGE_OPTIONS = [
  { label: "Last 7 days", value: 7 },
  { label: "Last 30 days", value: 30 },
  { label: "All time", value: 0 },
] as const;

function getMistakeMeta(type: MistakeType) {
  return MISTAKE_TYPES.find((m) => m.type === type);
}

function formatDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function buildInsightMessage(logs: MistakeLogRow[]): string | null {
  if (logs.length < 3) return null;

  const counts: Record<MistakeType, number> = {
    knowledge_gap: 0,
    application_error: 0,
    careless: 0,
    time_pressure: 0,
  };
  for (const log of logs) {
    counts[log.mistake_type as MistakeType]++;
  }

  const sorted = (Object.entries(counts) as [MistakeType, number][]).sort(
    (a, b) => b[1] - a[1],
  );
  const [topType, topCount] = sorted[0];
  if (topCount === 0) return null;

  const pct = Math.round((topCount / logs.length) * 100);
  const meta = getMistakeMeta(topType);
  if (!meta) return null;

  const advice: Record<MistakeType, string> = {
    knowledge_gap: "You need more coverage. Prioritise learning over practice.",
    application_error: "You know the theory — your bottleneck is practice, not coverage.",
    careless: "Slow down on easy questions. One careless mistake can cost more than an unseen question.",
    time_pressure: "Work on speed drills and section time management.",
  };

  return `${pct}% ${meta.label} · ${advice[topType]}`;
}

export function MistakeLogClient() {
  const [addOpen, setAddOpen] = useState(false);
  const [logs, setLogs] = useState<MistakeLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState("");
  const [filterType, setFilterType] = useState<MistakeType | "">("");
  const [filterDays, setFilterDays] = useState<0 | 7 | 30>(30);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { subjects } = useDoubtSyllabusSubjects();

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getMistakeLogs({
      subject: filterSubject || undefined,
      mistakeType: filterType || undefined,
      daysBack: filterDays > 0 ? filterDays : undefined,
    });
    if (result.ok) setLogs(result.data);
    setLoading(false);
  }, [filterSubject, filterType, filterDays]);

  useEffect(() => { void load(); }, [load]);

  const handleDelete = useCallback(async (id: string) => {
    setDeleting(id);
    await deleteMistakeLog(id);
    setDeleting(null);
    void load();
  }, [load]);

  const handleToggleRevision = useCallback(async (log: MistakeLogRow) => {
    await updateMistakeLog(log.id, { flagForRevision: !log.flag_for_revision });
    void load();
  }, [load]);

  const insight = buildInsightMessage(logs);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="kal-hero-heading">Mistake Log</h1>
          <p className="text-sm text-kal-text-secondary mt-0.5">
            Track errors by type. Find your real bottleneck.
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-kal-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-kal-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Log mistake
        </button>
      </div>

      {/* Insight banner */}
      {insight && (
        <div className="rounded-xl border border-kal-accent/30 bg-kal-accent-soft/40 px-4 py-3">
          <p className="text-sm font-medium text-kal-text">{insight}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="h-4 w-4 text-kal-text-secondary shrink-0" />

        <select
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="rounded-xl border border-kal-border bg-kal-surface/60 px-3 py-1.5 text-sm text-kal-text outline-none focus:ring-2 focus:ring-kal-accent/40"
        >
          <option value="">All subjects</option>
          {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as MistakeType | "")}
          className="rounded-xl border border-kal-border bg-kal-surface/60 px-3 py-1.5 text-sm text-kal-text outline-none focus:ring-2 focus:ring-kal-accent/40"
        >
          <option value="">All types</option>
          {MISTAKE_TYPES.map(({ type, label }) => (
            <option key={type} value={type}>{label}</option>
          ))}
        </select>

        <select
          value={filterDays}
          onChange={(e) => setFilterDays(Number(e.target.value) as 0 | 7 | 30)}
          className="rounded-xl border border-kal-border bg-kal-surface/60 px-3 py-1.5 text-sm text-kal-text outline-none focus:ring-2 focus:ring-kal-accent/40"
        >
          {RANGE_OPTIONS.map(({ label, value }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex min-h-[160px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-kal-accent/60" />
        </div>
      ) : logs.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-kal-text-secondary">
            No mistakes logged yet — log your first error to start finding patterns.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {logs.map((log) => {
            const meta = getMistakeMeta(log.mistake_type as MistakeType);
            const Icon = meta?.icon;
            return (
              <li
                key={log.id}
                className="kal-glass-card rounded-2xl p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {Icon && (
                      <Icon className={clsx("h-4 w-4 shrink-0", meta?.colorClass)} aria-hidden />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-kal-text truncate">
                        {log.subject}
                        {log.topic_label && (
                          <span className="font-normal text-kal-text-secondary"> · {log.topic_label}</span>
                        )}
                      </p>
                      <p className={clsx("text-xs", meta?.colorClass)}>{meta?.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleToggleRevision(log)}
                      title={log.flag_for_revision ? "Unflag for revision" : "Flag for revision"}
                      className={clsx(
                        "rounded-lg p-1.5 transition-colors",
                        log.flag_for_revision
                          ? "text-kal-accent bg-kal-accent-soft/40"
                          : "text-kal-text-secondary/50 hover:text-kal-accent",
                      )}
                    >
                      <BookmarkCheck className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(log.id)}
                      disabled={deleting === log.id}
                      className="rounded-lg p-1.5 text-kal-text-secondary/50 hover:text-red-500 transition-colors disabled:opacity-40"
                    >
                      {deleting === log.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />
                      }
                    </button>
                  </div>
                </div>

                {log.note && (
                  <p className="text-sm text-kal-text-secondary leading-relaxed pl-6">{log.note}</p>
                )}

                <div className="flex items-center gap-3 pl-6">
                  <span className="text-xs text-kal-text-secondary/70">{formatDate(log.logged_at)}</span>
                  {log.source && (
                    <span className="text-xs text-kal-text-secondary/70 capitalize">{log.source.replace("_", " ")}</span>
                  )}
                  {log.flag_for_revision && (
                    <span className="text-xs font-medium text-kal-accent">Flagged for revision</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AddMistakeSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => void load()}
        syllabusSubjects={subjects}
      />
    </div>
  );
}
