"use client";

import { Check, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  onDismiss: () => void;
  /** Default 6000 */
  autoHideMs?: number;
};

/**
 * Floating success popup when a revision reminder is saved from the daily plan.
 */
export function RevisionScheduledToast({
  open,
  onDismiss,
  autoHideMs = 6000,
}: Props) {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!open || autoHideMs <= 0) return;
    const t = window.setTimeout(() => onDismissRef.current(), autoHideMs);
    return () => window.clearTimeout(t);
  }, [open, autoHideMs]);

  if (!open) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:bottom-2"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-kal-accent/25 bg-kal-card/95 px-4 py-3.5 text-sm shadow-lg shadow-kal-accent/10 ring-1 ring-kal-border/50 backdrop-blur-md dark:bg-zinc-900/95"
      >
        <div
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-kal-accent/15 text-kal-accent"
          aria-hidden
        >
          <Check className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="font-semibold text-kal-text">Revision scheduled</p>
          <p className="mt-1 text-xs leading-relaxed text-kal-muted">
            It is on your list with the due date you picked. You can open Revision
            Reminders anytime to review or edit it.
          </p>
          <Link
            href="/revision-reminders"
            className="mt-2 inline-block text-xs font-bold text-kal-accent underline-offset-2 hover:underline"
            onClick={() => onDismiss()}
          >
            Open Revision Reminders
          </Link>
        </div>
        <button
          type="button"
          onClick={() => onDismiss()}
          className="shrink-0 rounded-lg p-1.5 text-kal-muted transition-colors hover:bg-kal-card-muted hover:text-kal-text"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
