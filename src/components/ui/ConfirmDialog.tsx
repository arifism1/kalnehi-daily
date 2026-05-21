"use client";

import clsx from "clsx";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Danger styling for destructive actions */
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  danger = true,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-kal-overlay backdrop-blur-sm"
        onClick={busy ? undefined : onCancel}
        disabled={busy}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        className="kal-glass-panel relative z-[81] flex min-h-0 w-full max-w-md max-h-[min(92dvh,40rem)] flex-col overflow-hidden rounded-2xl sm:rounded-2xl"
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-6 [-webkit-overflow-scrolling:touch] sm:px-6">
        <h2
          id="confirm-dialog-title"
          className="text-lg font-semibold tracking-tight text-kal-text"
        >
          {title}
        </h2>
        <p
          id="confirm-dialog-desc"
          className="mt-2 text-sm leading-relaxed text-kal-muted"
        >
          {description}
        </p>
        </div>
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-kal-border/50 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="kal-glass-subtle min-h-[48px] rounded-xl px-4 py-3 text-sm font-semibold text-kal-text sm:min-h-[44px] sm:px-5"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={clsx(
              "min-h-[48px] rounded-xl px-4 py-3 text-sm font-semibold sm:min-h-[44px] sm:px-5",
              danger
                ? "bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-600"
                : "bg-kal-accent text-kal-accent-foreground hover:bg-kal-accent-hover",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
