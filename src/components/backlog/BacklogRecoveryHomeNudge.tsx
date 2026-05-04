"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  fetchBacklogRecoverySummaryForHome,
  rolloverMissedBacklogRecoveryTasks,
} from "@/actions/backlogRecovery";
import { useCalendarDate } from "@/hooks/useCalendarDate";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Runs recovery rollover on mount, then nudges when there are pending backlog items.
 */
export function BacklogRecoveryHomeNudge() {
  const user = useAuthStore((s) => s.user);
  const today = useCalendarDate();
  const [pending, setPending] = useState<number | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setPending(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      await rolloverMissedBacklogRecoveryTasks(today);
      const s = await fetchBacklogRecoverySummaryForHome();
      if (!cancelled && s.ok) setPending(s.pendingCount);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, today]);

  if (pending === null || pending === 0) return null;

  return (
    <div
      role="status"
      className="rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/95 to-white px-4 py-3.5 shadow-sm dark:border-violet-500/35 dark:from-violet-950/40 dark:to-stone-900/60"
    >
      <p className="text-sm font-semibold text-kal-text">
        You have{" "}
        <span className="tabular-nums text-violet-700 dark:text-violet-200">{pending}</span>{" "}
        pending topic{pending === 1 ? "" : "s"}
      </p>
      <p className="mt-1 text-xs text-kal-muted">
        Nothing disappears — keep them in motion with a short recovery pass.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/backlog-tracker"
          className="inline-flex rounded-xl bg-kal-accent px-3 py-2 text-xs font-bold text-kal-accent-foreground"
        >
          Open Backlog Tracker
        </Link>
        <Link
          href="/backlog-list"
          className="inline-flex rounded-xl border border-kal-border px-3 py-2 text-xs font-semibold text-kal-text"
        >
          Backlog List
        </Link>
      </div>
    </div>
  );
}
