"use client";

import clsx from "clsx";
import { CloudOff, Loader2, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useSyncStore } from "@/store/useSyncStore";

export function SyncStatusBanner() {
  const isOnline = useSyncStore((s) => s.isOnline);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const lastSyncError = useSyncStore((s) => s.lastSyncError);
  const requestRetry = useSyncStore((s) => s.requestRetry);

  const [dismissed, setDismissed] = useState(false);
  const [retrying, setRetrying] = useState(false);

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
          "mb-3 flex items-start gap-2 rounded-xl border px-2.5 py-2 text-[11px] leading-snug",
          "border-amber-500/20 bg-amber-950/40 text-amber-200",
        )}
      >
        <p className="min-w-0 flex-1 pt-0.5">{lastSyncError}</p>
        <button
          type="button"
          onClick={() => void onRetry()}
          disabled={retrying}
          className="shrink-0 rounded-lg bg-amber-600/80 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
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
          className="shrink-0 rounded-md p-0.5 text-amber-400/60 hover:bg-white/5 hover:text-amber-300"
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
          "mb-3 flex items-start gap-2 rounded-xl border px-2.5 py-1.5 text-[10px] leading-snug",
          "border-white/[0.06] bg-slate-900/70 text-slate-400 backdrop-blur-sm",
        )}
      >
        <CloudOff className="mt-0.5 h-3 w-3 shrink-0 text-slate-500" />
        <p className="min-w-0 flex-1 pt-0.5">
          You&apos;re offline — your work is saved on this device
          {pendingCount > 0 &&
            ` (${pendingCount} change${pendingCount > 1 ? "s" : ""} waiting to sync)`}
          .
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-md p-0.5 text-slate-500 hover:bg-white/5 hover:text-slate-300"
          aria-label="Dismiss"
        >
          <X className="h-3 w-3" strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div
        role="status"
        className={clsx(
          "mb-3 flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-[10px] leading-snug",
          "border-emerald-500/15 bg-emerald-950/30 text-emerald-300/80",
        )}
      >
        <Loader2 className="h-3 w-3 shrink-0 animate-spin text-emerald-400/70" />
        <p className="min-w-0 flex-1">
          Syncing {pendingCount} change{pendingCount > 1 ? "s" : ""}…
        </p>
      </div>
    );
  }

  return null;
}
