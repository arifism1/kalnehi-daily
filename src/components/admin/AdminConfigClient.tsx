"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";

type Props = {
  config: Record<string, string>;
  descriptions: Record<string, string>;
  userId: string;
};

type EditState = { key: string; value: string } | null;

export function AdminConfigClient({ config, descriptions, userId }: Props) {
  const [editing, setEditing] = useState<EditState>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [localConfig, setLocalConfig] = useState(config);

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: editing.key, value: editing.value }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Save failed.");
        setSaving(false);
        return;
      }
      setLocalConfig((prev) => ({ ...prev, [editing.key]: editing.value }));
      setSavedKeys((s) => new Set([...s, editing.key]));
      setEditing(null);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const keys = Object.keys(localConfig).sort();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-kal-text">Admin Config</h1>
        <p className="mt-0.5 text-sm text-kal-muted">
          Changes are logged with your user ID and timestamp. All changes take effect immediately.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-kal-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-kal-border bg-kal-card/70">
              {["Key", "Description", "Value", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-kal-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {keys.map((key, i) => {
              const isEditing = editing?.key === key;
              const wasSaved = savedKeys.has(key);

              return (
                <tr key={key} className={i % 2 === 0 ? "bg-kal-card/20" : ""}>
                  <td className="px-4 py-3 font-mono text-xs text-kal-text">{key}</td>
                  <td className="px-4 py-3 text-xs text-kal-text-secondary">
                    {descriptions[key] ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editing.value}
                        onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                        className="w-full rounded-lg border border-kal-accent/40 bg-kal-card px-2 py-1 text-sm font-mono text-kal-text focus:outline-none focus:ring-1 focus:ring-kal-accent/50"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSave();
                          if (e.key === "Escape") setEditing(null);
                        }}
                      />
                    ) : (
                      <span className={`font-mono text-xs ${wasSaved ? "text-emerald-500" : "text-kal-text"}`}>
                        {localConfig[key]}
                        {wasSaved && " ✓"}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={handleSave}
                          disabled={saving}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-kal-accent/15 text-kal-accent hover:bg-kal-accent/25 disabled:opacity-50"
                          aria-label="Save"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(null)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-kal-card-muted text-kal-muted hover:text-kal-text"
                          aria-label="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditing({ key, value: localConfig[key] ?? "" })}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-kal-muted hover:bg-kal-card hover:text-kal-text"
                        aria-label={`Edit ${key}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-kal-muted">
        Changes saved by user <span className="font-mono">{userId.slice(0, 8)}…</span>
      </p>
    </div>
  );
}
