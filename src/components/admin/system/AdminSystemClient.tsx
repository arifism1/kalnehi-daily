"use client";

import { useState } from "react";
import clsx from "clsx";

import type { AppConfig, FeatureFlag, AppConfigLogEntry } from "@/lib/admin/killSwitch";
import { AdminDailyCapSection, type DailyCountRow } from "./AdminDailyCapSection";

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtIst(ts: string | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function minutesAgo(ts: string | null): number | null {
  if (!ts) return null;
  return Math.round((Date.now() - new Date(ts).getTime()) / 60000);
}

const FEATURE_LABELS: Record<string, string> = {
  prepbrain_ai: "mastermind strategy coach",
  voice_control: "Voice commands & dictation",
  marks_engine: "Marks engine & rank prediction",
  spaced_revision: "Revision Tracker",
  study_camera: "On-camera study sessions",
  batch_system: "Batch opening & waitlist",
  payments: "Razorpay payment processing",
  notifications: "Outbound notifications",
  new_signups: "New user registration",
};

// ─── ConfirmModal ─────────────────────────────────────────────────────────────

type ConfirmModalProps = {
  title: string;
  body: string;
  confirmLabel: string;
  confirmDanger?: boolean;
  reason?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
};

function ConfirmModal({
  title,
  body,
  confirmLabel,
  confirmDanger,
  reason,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [reasonText, setReasonText] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-kal-overlay px-4">
      <div className="w-full max-w-md rounded-2xl border border-kal-border bg-kal-card p-6 shadow-xl">
        <h2 className="text-base font-semibold text-kal-text">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-kal-text-secondary">{body}</p>

        {reason && (
          <div className="mt-4">
            <label className="block text-xs font-medium text-kal-muted">
              Reason{" "}
              <span className="font-normal text-kal-muted/70">(optional — saved to audit log)</span>
            </label>
            <input
              type="text"
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="e.g. Deploying DB migration"
              className="mt-1.5 w-full rounded-lg border border-kal-border bg-kal-input-bg px-3 py-2 text-sm text-kal-text placeholder:text-kal-muted/60 focus:outline-none focus:ring-1 focus:ring-kal-accent"
            />
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-kal-text-secondary hover:text-kal-text"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reasonText)}
            className={clsx(
              "rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90",
              confirmDanger ? "bg-red-600" : "bg-kal-success-text",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DisableFeatureModal ───────────────────────────────────────────────────────

function DisableFeatureModal({
  featureKey,
  onConfirm,
  onCancel,
}: {
  featureKey: string;
  onConfirm: (message: string) => void;
  onCancel: () => void;
}) {
  const [msg, setMsg] = useState("This feature is temporarily unavailable.");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-kal-overlay px-4">
      <div className="w-full max-w-md rounded-2xl border border-kal-border bg-kal-card p-6 shadow-xl">
        <h2 className="text-base font-semibold text-kal-text">
          Disable {FEATURE_LABELS[featureKey] ?? featureKey}?
        </h2>
        <p className="mt-1.5 text-sm text-kal-text-secondary">
          Users who try to use this feature will see the message below.
        </p>
        <div className="mt-4">
          <label className="block text-xs font-medium text-kal-muted">Message shown to users</label>
          <input
            type="text"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-kal-border bg-kal-input-bg px-3 py-2 text-sm text-kal-text focus:outline-none focus:ring-1 focus:ring-kal-accent"
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-kal-text-secondary hover:text-kal-text"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(msg)}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Save and disable
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-kal-border bg-kal-card/50 p-5 sm:p-6">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-kal-muted">{title}</h2>
      {children}
    </section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  config: AppConfig;
  flags: FeatureFlag[];
  auditLog: AppConfigLogEntry[];
  userId: string;
  dailyCapHistory?: DailyCountRow[];
};

type Modal =
  | { type: "disable-app" }
  | { type: "enable-app" }
  | { type: "disable-feature"; featureKey: string }
  | { type: "enable-feature"; featureKey: string };

export function AdminSystemClient({ config: initial, flags: initialFlags, auditLog: initialLog, dailyCapHistory = [] }: Props) {
  const [config, setConfig] = useState(initial);
  const [flags, setFlags] = useState(initialFlags);
  const [auditLog, setAuditLog] = useState(initialLog);
  const [modal, setModal] = useState<Modal | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── maintenance message editor
  const [editTitle, setEditTitle] = useState(config.maintenance_title);
  const [editMessage, setEditMessage] = useState(config.maintenance_message);
  const [editEta, setEditEta] = useState(config.maintenance_eta ?? "");
  const [msgSaving, setMsgSaving] = useState(false);
  const [msgSaved, setMsgSaved] = useState(false);

  // ── page offset for audit log
  const [logPage, setLogPage] = useState(0);
  const LOG_PAGE_SIZE = 15;

  async function toggleApp(enable: boolean, reason: string) {
    setBusy(true);
    setError(null);
    setModal(null);
    try {
      const res = await fetch("/api/admin/app-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", app_enabled: enable, reason }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Failed to update.");
        return;
      }
      const now = new Date().toISOString();
      setConfig((c) => ({
        ...c,
        app_enabled: enable,
        ...(enable
          ? { re_enabled_at: now, re_enabled_by: null }
          : { disabled_at: now, disabled_by: null }),
      }));
      // Prepend audit entry optimistically.
      setAuditLog((prev) => [
        {
          id: crypto.randomUUID(),
          action: enable ? "app_enabled" : "app_disabled",
          performed_by: null,
          performed_at: now,
          old_value: null,
          new_value: { app_enabled: enable },
          reason: reason || null,
        },
        ...prev,
      ]);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function saveMessage() {
    setMsgSaving(true);
    setMsgSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/admin/app-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_message",
          maintenance_title: editTitle,
          maintenance_message: editMessage,
          maintenance_eta: editEta || null,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Failed to save.");
        return;
      }
      setConfig((c) => ({
        ...c,
        maintenance_title: editTitle,
        maintenance_message: editMessage,
        maintenance_eta: editEta || null,
      }));
      setMsgSaved(true);
      setTimeout(() => setMsgSaved(false), 3000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setMsgSaving(false);
    }
  }

  async function toggleFeature(featureKey: string, enable: boolean, message?: string) {
    setBusy(true);
    setError(null);
    setModal(null);
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature_key: featureKey, enabled: enable, message }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Failed to update.");
        return;
      }
      const now = new Date().toISOString();
      setFlags((prev) =>
        prev.map((f) =>
          f.feature_key === featureKey
            ? { ...f, enabled: enable, disabled_message: enable ? null : (message ?? f.disabled_message), updated_at: now }
            : f,
        ),
      );
      setAuditLog((prev) => [
        {
          id: crypto.randomUUID(),
          action: enable ? `feature_enabled:${featureKey}` : `feature_disabled:${featureKey}`,
          performed_by: null,
          performed_at: now,
          old_value: null,
          new_value: { enabled: enable },
          reason: null,
        },
        ...prev,
      ]);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const pagedLog = auditLog.slice(logPage * LOG_PAGE_SIZE, (logPage + 1) * LOG_PAGE_SIZE);
  const totalPages = Math.ceil(auditLog.length / LOG_PAGE_SIZE);

  return (
    <>
      {/* Modals */}
      {modal?.type === "disable-app" && (
        <ConfirmModal
          title="Take Kalnehi Daily offline?"
          body="All users will see the maintenance screen immediately. Only admins can access the app while it is offline."
          confirmLabel="Yes, take offline"
          confirmDanger
          reason
          onConfirm={(reason) => toggleApp(false, reason)}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.type === "enable-app" && (
        <ConfirmModal
          title="Bring Kalnehi Daily back online?"
          body="All users will regain access immediately."
          confirmLabel="Yes, bring online"
          onConfirm={(reason) => toggleApp(true, reason)}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.type === "disable-feature" && (
        <DisableFeatureModal
          featureKey={modal.featureKey}
          onConfirm={(msg) => toggleFeature(modal.featureKey, false, msg)}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.type === "enable-feature" && (
        <ConfirmModal
          title={`Enable ${FEATURE_LABELS[modal.featureKey] ?? modal.featureKey}?`}
          body="Users will regain access to this feature immediately."
          confirmLabel="Enable"
          onConfirm={() => toggleFeature(modal.featureKey, true)}
          onCancel={() => setModal(null)}
        />
      )}

      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-xl font-semibold text-kal-text">System</h1>
          <p className="mt-0.5 text-sm text-kal-muted">
            Kill switch, feature flags, and audit log.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-kal-danger-border bg-kal-danger-soft px-4 py-3 text-sm text-kal-danger-text">
            {error}
          </div>
        )}

        {/* ── Section 1: Global Kill Switch ─────────────────────────────── */}
        <Section title="Global Kill Switch">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            {/* Status indicator */}
            <div className="flex items-center gap-4">
              <button
                onClick={() =>
                  setModal(config.app_enabled ? { type: "disable-app" } : { type: "enable-app" })
                }
                disabled={busy}
                aria-label={config.app_enabled ? "Take app offline" : "Bring app online"}
                className={clsx(
                  "relative h-8 w-14 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50",
                  config.app_enabled
                    ? "bg-kal-success-text focus:ring-kal-success-text"
                    : "bg-red-600 focus:ring-red-600",
                )}
              >
                <span
                  className={clsx(
                    "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform",
                    config.app_enabled ? "left-7" : "left-1",
                  )}
                />
              </button>
              <div>
                <p
                  className={clsx(
                    "text-base font-semibold",
                    config.app_enabled ? "text-kal-success-text" : "text-red-600",
                  )}
                >
                  {config.app_enabled ? "App is live" : "App is offline"}
                </p>
                <p className="text-xs text-kal-muted">
                  {config.app_enabled
                    ? "All users have normal access"
                    : config.disabled_at
                      ? (() => {
                          const mins = minutesAgo(config.disabled_at);
                          return `Disabled ${mins !== null ? `${mins} min ago` : "recently"}`;
                        })()
                      : "Currently offline"}
                </p>
              </div>
            </div>

            {/* Action button */}
            <button
              onClick={() =>
                setModal(config.app_enabled ? { type: "disable-app" } : { type: "enable-app" })
              }
              disabled={busy}
              className={clsx(
                "rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40",
                config.app_enabled ? "bg-red-600" : "bg-kal-success-text",
              )}
            >
              {config.app_enabled ? "Take app offline" : "Bring app back online"}
            </button>
          </div>

          {/* Maintenance message editor — always visible, applies on next disable */}
          <div className="mt-6 border-t border-kal-border pt-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-kal-muted">
              Maintenance screen content
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-kal-muted">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-kal-border bg-kal-input-bg px-3 py-2 text-sm text-kal-text focus:outline-none focus:ring-1 focus:ring-kal-accent"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-kal-muted">Message</label>
                <textarea
                  value={editMessage}
                  onChange={(e) => setEditMessage(e.target.value)}
                  rows={2}
                  className="mt-1 w-full resize-none rounded-lg border border-kal-border bg-kal-input-bg px-3 py-2 text-sm text-kal-text focus:outline-none focus:ring-1 focus:ring-kal-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-kal-muted">
                  ETA{" "}
                  <span className="font-normal text-kal-muted/70">(optional)</span>
                </label>
                <input
                  type="text"
                  value={editEta}
                  onChange={(e) => setEditEta(e.target.value)}
                  placeholder="e.g. Back by 4 PM today"
                  className="mt-1 w-full rounded-lg border border-kal-border bg-kal-input-bg px-3 py-2 text-sm text-kal-text placeholder:text-kal-muted/60 focus:outline-none focus:ring-1 focus:ring-kal-accent"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={saveMessage}
                  disabled={msgSaving}
                  className="rounded-lg bg-kal-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {msgSaving ? "Saving…" : msgSaved ? "Saved ✓" : "Save message"}
                </button>
              </div>
            </div>

            {/* Live preview */}
            <div className="mt-4 rounded-xl border border-kal-border bg-kal-page/60 p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-kal-muted">
                Preview
              </p>
              <p className="mt-2 font-serif text-lg text-kal-text">{editTitle || "Back soon."}</p>
              <p className="mt-1 text-xs text-kal-text-secondary">{editMessage}</p>
              {editEta && (
                <p className="mt-1 text-[11px] text-kal-muted">Expected back: {editEta}</p>
              )}
            </div>
          </div>
        </Section>

        {/* ── Section 2: Feature Flags ──────────────────────────────────── */}
        <Section title="Feature Flags">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-kal-border text-left">
                  <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wider text-kal-muted">
                    Feature
                  </th>
                  <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wider text-kal-muted">
                    Status
                  </th>
                  <th className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wider text-kal-muted">
                    Last changed
                  </th>
                  <th className="pb-2 text-xs font-semibold uppercase tracking-wider text-kal-muted">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {flags.map((flag) => (
                  <tr key={flag.feature_key} className="border-b border-kal-border/50 last:border-0">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-kal-text">
                        {FEATURE_LABELS[flag.feature_key] ?? flag.feature_key}
                      </p>
                      <p className="text-[11px] text-kal-muted">{flag.feature_key}</p>
                      {!flag.enabled && flag.disabled_message && (
                        <p className="mt-0.5 text-[11px] italic text-kal-muted/80">
                          &ldquo;{flag.disabled_message}&rdquo;
                        </p>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={clsx(
                          "inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                          flag.enabled
                            ? "bg-kal-success-soft text-kal-success-text"
                            : "bg-kal-danger-soft text-kal-danger-text",
                        )}
                      >
                        {flag.enabled ? "On" : "Off"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-kal-muted">
                      {fmtIst(flag.updated_at)}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() =>
                          setModal(
                            flag.enabled
                              ? { type: "disable-feature", featureKey: flag.feature_key }
                              : { type: "enable-feature", featureKey: flag.feature_key },
                          )
                        }
                        disabled={busy}
                        className={clsx(
                          "rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40",
                          flag.enabled
                            ? "bg-kal-danger-soft text-kal-danger-text"
                            : "bg-kal-success-soft text-kal-success-text",
                        )}
                      >
                        {flag.enabled ? "Disable" : "Enable"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── Section 3: Audit Log ──────────────────────────────────────── */}
        <Section title="Audit Log">
          <p className="mb-3 text-xs text-kal-muted">
            Read-only. Every app_config and feature flag change is recorded here permanently.
          </p>
          {auditLog.length === 0 ? (
            <p className="text-sm text-kal-muted">No entries yet.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-kal-border text-left">
                      {(["Time (IST)", "Action", "Reason"] as const).map((h) => (
                        <th
                          key={h}
                          className="pb-2 pr-4 text-xs font-semibold uppercase tracking-wider text-kal-muted"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedLog.map((entry) => (
                      <tr
                        key={entry.id}
                        className="border-b border-kal-border/50 last:border-0"
                      >
                        <td className="py-2.5 pr-4 text-xs text-kal-muted whitespace-nowrap">
                          {fmtIst(entry.performed_at)}
                        </td>
                        <td className="py-2.5 pr-4">
                          <ActionBadge action={entry.action} />
                        </td>
                        <td className="py-2.5 text-xs text-kal-text-secondary">
                          {entry.reason ?? <span className="text-kal-muted/60">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-3 flex items-center justify-between text-xs text-kal-muted">
                  <span>
                    Page {logPage + 1} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLogPage((p) => Math.max(0, p - 1))}
                      disabled={logPage === 0}
                      className="rounded px-2 py-1 hover:bg-kal-card disabled:opacity-40"
                    >
                      ← Prev
                    </button>
                    <button
                      onClick={() => setLogPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={logPage >= totalPages - 1}
                      className="rounded px-2 py-1 hover:bg-kal-card disabled:opacity-40"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Section>

        <AdminDailyCapSection
          initialConfig={config}
          initialHistory={dailyCapHistory}
        />
      </div>
    </>
  );
}

function ActionBadge({ action }: { action: string }) {
  const isDisable =
    action === "app_disabled" || action.startsWith("feature_disabled:");
  const isEnable =
    action === "app_enabled" || action.startsWith("feature_enabled:");

  const label = action
    .replace("feature_disabled:", "disabled: ")
    .replace("feature_enabled:", "enabled: ")
    .replace(/_/g, " ");

  return (
    <span
      className={clsx(
        "inline-block rounded-md px-2 py-0.5 text-[11px] font-medium",
        isDisable && "bg-kal-danger-soft text-kal-danger-text",
        isEnable && "bg-kal-success-soft text-kal-success-text",
        !isDisable && !isEnable && "bg-kal-accent-soft text-kal-accent-dark",
      )}
    >
      {label}
    </span>
  );
}
