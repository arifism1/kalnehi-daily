"use client";

import clsx from "clsx";

import { KalModalShell } from "@/components/ui/KalModalShell";

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
    <KalModalShell
      role="alertdialog"
      title={title}
      titleId="confirm-dialog-title"
      onClose={onCancel}
      busy={busy}
      zIndex={80}
      panelClassName="max-h-[min(var(--kal-sheet-max-h,92dvh),40rem)] sm:rounded-2xl"
      scrollClassName="p-6 sm:px-6"
      footer={
        <div className="flex flex-col-reverse gap-2 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
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
      }
    >
      <p
        id="confirm-dialog-desc"
        className="text-sm leading-relaxed text-kal-muted"
      >
        {description}
      </p>
    </KalModalShell>
  );
}
