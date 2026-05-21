"use client";

import { useState } from "react";
import { Check, Pencil, RefreshCw, X } from "lucide-react";

import { syncDeepInfraPricing, type DeepInfraSyncedModel } from "@/lib/admin/syncDeepInfraPricing";

/** Shown in admin table but cannot be changed via API (DB-enforced or code constants). */
const READ_ONLY_CONFIG_KEYS = new Set(["trial_duration_days"]);

const DEEPINFRA_SYNC_KEYS = new Set([
  "ai_deepinfra_input_inr_per_m",
  "ai_deepinfra_output_inr_per_m",
  "ai_deepinfra_mistral_input_inr_per_m",
  "ai_deepinfra_mistral_output_inr_per_m",
]);

type Props = {
  config: Record<string, string>;
  descriptions: Record<string, string>;
  userId: string;
};

type EditState = { key: string; value: string } | null;

function formatSyncLine(s: DeepInfraSyncedModel): string {
  const label = s.kind === "mastermind_mistral" ? "Mastermind Mistral" : "DeepInfra chat";
  const short = s.modelSlug.includes("/") ? s.modelSlug.split("/").pop() ?? s.modelSlug : s.modelSlug;
  return `${label} (${short}): ₹${s.inputInrPerM}/M in · ₹${s.outputInrPerM}/M out`;
}

export function AdminConfigClient({ config, descriptions, userId }: Props) {
  const [editing, setEditing] = useState<EditState>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [localConfig, setLocalConfig] = useState(config);

  async function handleSyncDeepInfra() {
    setSyncing(true);
    setSyncStatus(null);
    setError(null);
    try {
      const result = await syncDeepInfraPricing();
      if (!result.ok) {
        setError(`Sync failed: ${result.error}`);
      } else {
        const next: Record<string, string> = { ...localConfig };
        const saved = new Set(savedKeys);
        for (const s of result.synced) {
          if (s.kind === "deepinfra_chat") {
            next.ai_deepinfra_input_inr_per_m = String(s.inputInrPerM);
            next.ai_deepinfra_output_inr_per_m = String(s.outputInrPerM);
            saved.add("ai_deepinfra_input_inr_per_m");
            saved.add("ai_deepinfra_output_inr_per_m");
          } else {
            next.ai_deepinfra_mistral_input_inr_per_m = String(s.inputInrPerM);
            next.ai_deepinfra_mistral_output_inr_per_m = String(s.outputInrPerM);
            saved.add("ai_deepinfra_mistral_input_inr_per_m");
            saved.add("ai_deepinfra_mistral_output_inr_per_m");
          }
        }
        setLocalConfig(next);
        setSavedKeys(saved);
        const lines = result.synced.map((s) => formatSyncLine(s));
        let msg = lines.join("\n");
        if (result.partialErrors?.length) {
          msg += `\n\nPartial errors:\n${result.partialErrors.join("\n")}`;
        }
        setSyncStatus(msg);
      }
    } catch {
      setError("Sync request failed. Please try again.");
    } finally {
      setSyncing(false);
    }
  }

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
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-kal-text">Admin Config</h1>
          <p className="mt-0.5 text-sm text-kal-muted">
            Changes are logged with your user ID and timestamp. All changes take effect immediately.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSyncDeepInfra}
          disabled={syncing}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-kal-accent/15 px-3 py-2 text-xs font-medium text-kal-accent hover:bg-kal-accent/25 disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing…" : "Sync DeepInfra prices"}
        </button>
      </div>

      {syncStatus && (
        <div className="mb-4 whitespace-pre-wrap rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-500">
          {syncStatus}
        </div>
      )}

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

              const readOnly = READ_ONLY_CONFIG_KEYS.has(key);

              return (
                <tr key={key} className={i % 2 === 0 ? "bg-kal-card/20" : ""}>
                  <td className="px-4 py-3 font-mono text-xs text-kal-text">
                    {key}
                    {readOnly && (
                      <span className="ml-1.5 rounded bg-kal-muted/20 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-kal-muted">
                        read-only
                      </span>
                    )}
                    {DEEPINFRA_SYNC_KEYS.has(key) && (
                      <span className="ml-1.5 rounded bg-kal-accent/15 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-kal-accent">
                        auto
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-kal-text-secondary">
                    {descriptions[key] ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {!readOnly && isEditing && editing ? (
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
                    {readOnly ? (
                      <span className="text-[10px] text-kal-muted">—</span>
                    ) : isEditing ? (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={handleSave}
                          disabled={saving}
                          className="flex size-7 items-center justify-center rounded-lg bg-kal-accent/15 text-kal-accent hover:bg-kal-accent/25 disabled:opacity-50"
                          aria-label="Save"
                        >
                          <Check className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(null)}
                          className="flex size-7 items-center justify-center rounded-lg bg-kal-card-muted text-kal-muted hover:text-kal-text"
                          aria-label="Cancel"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditing({ key, value: localConfig[key] ?? "" })}
                        className="flex size-7 items-center justify-center rounded-lg text-kal-muted hover:bg-kal-card hover:text-kal-text"
                        aria-label={`Edit ${key}`}
                      >
                        <Pencil className="size-3.5" />
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
