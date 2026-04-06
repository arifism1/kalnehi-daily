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
        className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={busy ? undefined : onCancel}
        disabled={busy}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        className="relative z-[81] w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0c1220] p-5 shadow-2xl shadow-black/50 sm:rounded-3xl"
      >
        <h2
          id="confirm-dialog-title"
          className="text-lg font-bold tracking-tight text-white"
        >
          {title}
        </h2>
        <p
          id="confirm-dialog-desc"
          className="mt-2 text-sm leading-relaxed text-zinc-400"
        >
          {description}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="min-h-[48px] rounded-xl border border-slate-600 bg-slate-900/80 px-4 py-3 text-sm font-semibold text-zinc-200 sm:min-h-[44px] sm:px-5"
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
                : "bg-emerald-600 text-white hover:bg-emerald-500",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
