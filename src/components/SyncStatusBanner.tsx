"use client";

import clsx from "clsx";
import { CloudOff, Loader2, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useSyncStore } from "@/store/useSyncStore";

const SYNC_PENDING_SHOW_DELAY_MS = 72;
const SYNC_PENDING_MAX_VISIBLE_MS = 1200;

export function SyncStatusBanner() {
  const isOnline = useSyncStore((s) => s.isOnline);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const lastSyncError = useSyncStore((s) => s.lastSyncError);
  const [dismissed, setDismissed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  /** Avoid flashing “Syncing…” when the outbox clears in a few ms (instant flush). */
  const [showPendingBanner, setShowPendingBanner] = useState(false);
  const [pendingCapped, setPendingCapped] = useState(false);

  useEffect(() => {
    if (pendingCount === 0) {
      setShowPendingBanner(false);
      setPendingCapped(false);
      return;
    }
    if (pendingCapped) return;
    const t = setTimeout(
      () => setShowPendingBanner(true),
      SYNC_PENDING_SHOW_DELAY_MS,
    );
    return () => clearTimeout(t);
  }, [pendingCount, pendingCapped]);

  useEffect(() => {
    if (!showPendingBanner || pendingCount === 0) return;
    const t = setTimeout(() => {
      setShowPendingBanner(false);
      setPendingCapped(true);
    }, SYNC_PENDING_MAX_VISIBLE_MS);
    return () => clearTimeout(t);
  }, [showPendingBanner, pendingCount]);

  useEffect(() => {
    if (isOnline && !lastSyncError) setDismissed(false);
  }, [isOnline, lastSyncError]);

  const onDismiss = useCallback(() => setDismissed(true), []);

  const onRetry = useCallback(async () => {
    setRetrying(true);
    try {
      const { retryDeadLettered, flushOutbox } = await import("@/lib/sync");
      await retryDeadLettered();
      const userId =
        (await import("@/store/useAuthStore")).useAuthStore.getState().user?.id;
      if (userId) await flushOutbox(userId);
    } finally {
      setRetrying(false);
    }
  }, []);

  if (dismissed) return null;

  if (lastSyncError) {
    return (
      <div
        role="status"
        className={clsx(
          "mb-4 flex items-start gap-2 rounded-[0.875rem] border px-3 py-2.5 text-[11px] leading-snug",
          "border-[var(--kal-warn-border)] bg-[var(--kal-warn-soft)] text-[var(--kal-warn-text)]",
        )}
      >
        <p className="min-w-0 flex-1 pt-0.5">
          Sync failed: {lastSyncError}
        </p>
        <button
          type="button"
          onClick={() => void onRetry()}
          disabled={retrying}
          className="shrink-0 rounded-lg bg-kal-accent px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-kal-accent-hover disabled:opacity-50"
        >
          {retrying ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <span className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3" /> Retry
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-md p-0.5 opacity-60 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
          aria-label="Dismiss"
        >
          <X className="h-3 w-3" strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div
        role="status"
        className={clsx(
          "mb-4 flex items-start gap-2 rounded-[0.875rem] border border-kal-border bg-kal-card-muted px-3 py-2 text-[10px] leading-snug text-kal-muted",
        )}
      >
        <CloudOff className="mt-0.5 h-3 w-3 shrink-0 text-kal-muted" />
        <p className="min-w-0 flex-1 pt-0.5">
          You&apos;re offline — your work is saved on this device
          {pendingCount > 0 &&
            ` (${pendingCount} change${pendingCount > 1 ? "s" : ""} waiting to sync)`}
          .
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-md p-0.5 text-kal-muted hover:bg-kal-border/40"
          aria-label="Dismiss"
        >
          <X className="h-3 w-3" strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  if (showPendingBanner && pendingCount > 0) {
    return (
      <div
        role="status"
        className={clsx(
          "mb-4 flex items-center gap-2 rounded-[0.875rem] border border-kal-accent/25 bg-kal-accent-soft px-3 py-2 text-[10px] leading-snug text-kal-text-secondary",
        )}
      >
        <Loader2 className="h-3 w-3 shrink-0 animate-spin text-kal-accent" />
        <p className="min-w-0 flex-1">
          Syncing {pendingCount} change{pendingCount > 1 ? "s" : ""}…
        </p>
      </div>
    );
  }

  return null;
}
