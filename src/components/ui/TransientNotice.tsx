"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

type TransientNoticeProps = {
  message: string | null;
  onDismiss: () => void;
  /** Auto-clear after ms (default 5000). Set 0 to disable. */
  autoHideMs?: number;
  variant?: "neutral" | "amber";
};

export function TransientNotice({
  message,
  onDismiss,
  autoHideMs = 5000,
  variant = "neutral",
}: TransientNoticeProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!message || autoHideMs <= 0) return;
    timerRef.current = setTimeout(() => {
      onDismissRef.current();
    }, autoHideMs);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [message, autoHideMs]);

  if (!message) return null;

  const tone =
    variant === "amber"
      ? "border-kal-warn-border bg-kal-warn-soft text-kal-warn-text dark:border-amber-500/20 dark:bg-amber-950/20 dark:text-amber-100/90"
      : "border-kal-border bg-kal-card-muted text-kal-text-secondary";

  return (
    <div
      role="status"
      className={`mt-3 flex items-start gap-2 rounded-xl border px-2.5 py-2 text-[11px] leading-snug shadow-sm backdrop-blur-sm ${tone}`}
    >
      <p className="min-w-0 flex-1 pt-0.5">{message}</p>
      <button
        type="button"
        onClick={() => {
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          onDismiss();
        }}
        className="shrink-0 rounded-lg p-1 text-kal-muted transition-colors hover:bg-kal-card hover:text-kal-text"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2.5} />
      </button>
    </div>
  );
}
