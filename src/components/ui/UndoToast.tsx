"use client";

import clsx from "clsx";

import { useUndoStore } from "@/store/useUndoStore";

export function UndoToast() {
  const open = useUndoStore((s) => s.open);
  const message = useUndoStore((s) => s.message);
  const dismissToast = useUndoStore((s) => s.dismissToast);
  const executeUndo = useUndoStore((s) => s.executeUndo);

  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex justify-center px-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4 sm:pb-6"
    >
      <div
        className={clsx(
          "pointer-events-auto flex w-full max-w-lg items-center gap-3 rounded-2xl border border-kal-border bg-kal-card px-5 py-4 kal-shadow-card",
        )}
      >
        <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-kal-text">
          {message}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void executeUndo()}
            className="rounded-xl bg-kal-accent px-3 py-2 text-xs font-bold uppercase tracking-wide text-kal-accent-foreground transition-colors hover:bg-kal-accent-hover active:scale-[0.98]"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={dismissToast}
            className="rounded-lg px-2 py-2 text-xs font-semibold text-kal-muted transition-colors hover:bg-kal-card-muted hover:text-kal-text"
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
