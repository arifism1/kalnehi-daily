"use client";

import { useState } from "react";

interface Topic {
  id: string;
  name: string;
  studiedDate: string;
}

interface RevisionEntry {
  topicName: string;
  studiedDate: string;
  reviews: { label: string; date: string }[];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const INTERVALS = [
  { label: "Day 1", days: 1 },
  { label: "Day 3", days: 3 },
  { label: "Day 7", days: 7 },
  { label: "Day 14", days: 14 },
  { label: "Day 30", days: 30 },
];

export function RevisionSchedulerClient() {
  const [topics, setTopics] = useState<Topic[]>([{ id: "1", name: "", studiedDate: new Date().toISOString().split("T")[0] }]);
  const [schedule, setSchedule] = useState<RevisionEntry[] | null>(null);

  function addTopic() {
    setTopics((prev) => [
      ...prev,
      { id: String(Date.now()), name: "", studiedDate: new Date().toISOString().split("T")[0] },
    ]);
  }

  function removeTopic(id: string) {
    setTopics((prev) => prev.filter((t) => t.id !== id));
  }

  function updateTopic(id: string, field: keyof Omit<Topic, "id">, value: string) {
    setTopics((prev) => prev.map((t) => t.id === id ? { ...t, [field]: value } : t));
  }

  function generate() {
    const valid = topics.filter((t) => t.name.trim() && t.studiedDate);
    if (valid.length === 0) return;
    const result: RevisionEntry[] = valid.map((t) => ({
      topicName: t.name.trim(),
      studiedDate: t.studiedDate,
      reviews: INTERVALS.map(({ label, days }) => ({
        label,
        date: addDays(t.studiedDate, days),
      })),
    }));
    setSchedule(result);
  }

  function exportCSV() {
    if (!schedule) return;
    const rows = ["Topic,Studied Date,Day 1,Day 3,Day 7,Day 14,Day 30"];
    for (const entry of schedule) {
      const cells = [
        `"${entry.topicName}"`,
        entry.studiedDate,
        ...entry.reviews.map((r) => r.date),
      ];
      rows.push(cells.join(","));
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kalnehi-revision-schedule.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyText() {
    if (!schedule) return;
    const lines = schedule.flatMap((entry) => [
      `**${entry.topicName}** (studied: ${formatDate(entry.studiedDate)})`,
      ...entry.reviews.map((r) => `  ${r.label}: ${formatDate(r.date)}`),
      "",
    ]);
    navigator.clipboard.writeText(lines.join("\n"));
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-kal-text-secondary">
          Your topics + when you studied them
        </p>
        {topics.map((topic, i) => (
          <div key={topic.id} className="flex gap-2 items-start">
            <div className="flex-1 grid gap-2 sm:grid-cols-2">
              <input
                type="text"
                placeholder={`Topic ${i + 1} (e.g. Rotational Motion)`}
                value={topic.name}
                onChange={(e) => updateTopic(topic.id, "name", e.target.value)}
                className="w-full rounded-xl border border-kal-border bg-kal-card px-3 py-2 text-sm text-kal-text placeholder:text-kal-muted focus:border-kal-accent/60 focus:outline-none"
              />
              <input
                type="date"
                value={topic.studiedDate}
                onChange={(e) => updateTopic(topic.id, "studiedDate", e.target.value)}
                className="w-full rounded-xl border border-kal-border bg-kal-card px-3 py-2 text-sm text-kal-text focus:border-kal-accent/60 focus:outline-none"
              />
            </div>
            {topics.length > 1 && (
              <button
                type="button"
                onClick={() => removeTopic(topic.id)}
                className="mt-0.5 rounded-lg p-2 text-kal-muted hover:text-red-500 transition-colors"
                aria-label="Remove topic"
              >
                ×
              </button>
            )}
          </div>
        ))}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={addTopic}
            className="rounded-xl border border-kal-border px-4 py-2 text-sm font-medium text-kal-text-secondary hover:border-kal-accent/40 hover:text-kal-accent-dark transition-colors"
          >
            + Add topic
          </button>
          <button
            type="button"
            onClick={generate}
            className="flex-1 min-h-[40px] rounded-xl bg-kal-accent px-4 text-sm font-bold text-white transition hover:brightness-105"
          >
            Generate schedule
          </button>
        </div>
      </div>

      {schedule && (
        <div className="space-y-4">
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={copyText}
              className="rounded-xl border border-kal-border px-3 py-1.5 text-xs font-semibold text-kal-text-secondary hover:border-kal-accent/40 transition-colors">
              Copy as text
            </button>
            <button type="button" onClick={exportCSV}
              className="rounded-xl border border-kal-border px-3 py-1.5 text-xs font-semibold text-kal-text-secondary hover:border-kal-accent/40 transition-colors">
              Export CSV
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-kal-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-kal-card border-b border-kal-border">
                  <th className="px-4 py-2 text-left font-semibold text-kal-text text-xs">Topic</th>
                  <th className="px-3 py-2 text-center font-semibold text-kal-text text-xs">Studied</th>
                  {INTERVALS.map(({ label }) => (
                    <th key={label} className="px-3 py-2 text-center font-semibold text-kal-text text-xs">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schedule.map((entry, i) => (
                  <tr key={entry.topicName} className={i % 2 === 0 ? "bg-kal-page" : "bg-kal-card/40"}>
                    <td className="px-4 py-2.5 font-medium text-kal-text text-xs">{entry.topicName}</td>
                    <td className="px-3 py-2.5 text-center text-xs text-kal-muted">{formatDate(entry.studiedDate)}</td>
                    {entry.reviews.map((r) => (
                      <td key={r.label} className="px-3 py-2.5 text-center text-xs text-kal-text-secondary">{formatDate(r.date)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-kal-muted">
            Review each topic at the scheduled dates for 15-20 minutes without reference material. Check what you remember, then verify.
          </p>
        </div>
      )}
    </div>
  );
}
