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
          "pointer-events-auto flex w-full max-w-lg items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#0c1220]/95 px-4 py-3 shadow-2xl shadow-black/50 backdrop-blur-md",
        )}
      >
        <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-zinc-200">
          {message}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void executeUndo()}
            className="rounded-lg bg-emerald-600/90 px-3 py-2 text-xs font-bold uppercase tracking-wide text-emerald-950 transition-colors hover:bg-emerald-500 active:scale-[0.98]"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={dismissToast}
            className="rounded-lg px-2 py-2 text-xs font-semibold text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-300"
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
