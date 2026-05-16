"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  fetchBacklogRecoverySummaryForHome,
  rolloverMissedBacklogRecoveryTasks,
} from "@/actions/backlogRecovery";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import * as storage from "@/lib/storage";
import { useAuthStore } from "@/store/useAuthStore";

const STORAGE_PREFIX = "kalnehi-backlog-home-nudge-dismissed";

/**
 * Runs recovery rollover on mount, then nudges when there are pending backlog items.
 */
export function BacklogRecoveryHomeNudge() {
  const user = useAuthStore((s) => s.user);
  const today = useCalendarDate();
  const [pending, setPending] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const dismissKey = user?.id ? `${STORAGE_PREFIX}:${user.id}:${today}` : null;

  const onDismiss = useCallback(() => {
    if (!dismissKey) return;
    void storage.setItem(dismissKey, "1");
    setDismissed(true);
  }, [dismissKey]);

  useEffect(() => {
    if (!user?.id) {
      setPending(null);
      setDismissed(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      await rolloverMissedBacklogRecoveryTasks(today);
      if (cancelled) return;
      const wasDismissed = (await storage.getItem(`${STORAGE_PREFIX}:${user.id}:${today}`)) === "1";
      if (cancelled) return;
      if (wasDismissed) {
        setDismissed(true);
        return;
      }
      setDismissed(false);
      const s = await fetchBacklogRecoverySummaryForHome();
      if (!cancelled && s.ok) setPending(s.pendingCount);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, today]);

  if (dismissed || pending === null || pending === 0) return null;

  return (
    <div
      role="status"
      className="relative rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/95 to-white py-3.5 pl-4 pr-10 shadow-sm dark:border-violet-500/35 dark:from-violet-950/40 dark:to-stone-900/60"
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute right-2 top-2 rounded-md p-1 text-kal-muted transition-colors hover:text-kal-text"
      >
        <X className="size-4" aria-hidden />
      </button>
      <p className="text-sm font-semibold text-kal-text">
        You have{" "}
        <span className="tabular-nums text-violet-700 dark:text-violet-200">{pending}</span>{" "}
        missed/unplanned backlog{pending === 1 ? "" : "s"}
      </p>
      <p className="mt-1 text-xs text-kal-muted">
        Plan a fix now
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/backlogs"
          className="inline-flex rounded-xl border border-kal-border px-3 py-2 text-xs font-semibold text-kal-text"
        >
          Backlogs
        </Link>
      </div>
    </div>
  );
}
