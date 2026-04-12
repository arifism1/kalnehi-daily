"use client";

import clsx from "clsx";

export function ContactSupportSuccessToast({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[95] flex justify-center px-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4 sm:pb-6"
    >
      <div
        className={clsx(
          "kal-glass-panel pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl px-4 py-3 shadow-lg",
        )}
      >
        <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-kal-text">
          {message}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg px-2 py-2 text-xs font-semibold text-kal-muted transition-colors hover:bg-kal-card-muted hover:text-kal-text"
        >
          OK
        </button>
      </div>
    </div>
  );
}
