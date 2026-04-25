"use client";

import { RefreshCw } from "lucide-react";

import { PWA_RELOADING_TEXT, PWA_UPDATE_BODY } from "@/lib/pwa-update-messages";

import { usePwaServiceWorkerUpdate } from "./PwaServiceWorkerUpdateProvider";

type PwaUpdateCalloutProps = { variant: "drawer" | "sidebar" | "toast" };

/**
 * Renders the update prompt when a new service worker has taken control.
 * Used in the nav drawer, desktop sidebar, and bottom toast (all platforms:
 * installed PWA or browser tab on iOS, Android, and desktop Chromium/WebKit).
 */
export function PwaUpdateCallout({ variant }: PwaUpdateCalloutProps) {
  const { updateReady, reloading, dismiss, applyReload } = usePwaServiceWorkerUpdate();

  if (!updateReady) return null;

  const message = reloading ? PWA_RELOADING_TEXT : PWA_UPDATE_BODY;

  if (variant === "toast") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[95] flex justify-center px-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4 sm:pb-6"
      >
        <div className="kal-glass-panel pointer-events-auto flex w-full max-w-lg items-center gap-3 rounded-2xl px-5 py-4">
          <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-kal-text">
            {message}
          </p>
          {!reloading && (
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={applyReload}
                className="rounded-xl bg-kal-accent px-3 py-2 text-xs font-bold uppercase tracking-wide text-kal-accent-foreground transition-colors hover:bg-kal-accent-hover active:scale-[0.98]"
              >
                Reload
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-lg px-2 py-2 text-xs font-semibold text-kal-muted transition-colors hover:bg-kal-card-muted hover:text-kal-text"
                aria-label="Dismiss"
              >
                Later
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (variant === "sidebar") {
    return (
      <div
        className="mb-2 mt-0.5 px-2"
        role="status"
        aria-live="polite"
      >
        <div className="rounded-lg border border-kal-accent/35 bg-kal-accent-soft/90 p-2.5 ring-1 ring-kal-accent/10 dark:border-kal-accent/30 dark:bg-kal-accent-soft/15 dark:ring-white/5">
          <p className="text-[11px] font-semibold leading-snug text-kal-accent-dark dark:text-kal-accent">
            {message}
          </p>
          {!reloading && (
            <div className="mt-2 flex flex-col gap-1.5">
              <button
                type="button"
                onClick={applyReload}
                className="inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-kal-accent px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-kal-accent-foreground transition-colors hover:bg-kal-accent-hover"
              >
                <RefreshCw className="h-3 w-3 shrink-0" aria-hidden />
                Reload
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="min-h-8 w-full rounded-md py-1 text-[11px] font-semibold text-kal-muted transition-colors hover:bg-kal-card-muted hover:text-kal-text"
              >
                Later
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // variant === "drawer"
  return (
    <div
      className="rounded-xl border border-kal-accent/35 bg-kal-accent-soft px-3 py-2.5 shadow-sm ring-1 ring-kal-accent/10 dark:border-kal-accent/30 dark:bg-kal-accent-soft/15 dark:ring-white/5"
      role="status"
      aria-live="polite"
    >
      <div className="flex min-h-[44px] flex-col justify-center gap-2 sm:min-h-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <p className="min-w-0 text-sm font-semibold leading-snug text-kal-accent-dark dark:text-kal-accent">
          {message}
        </p>
        {!reloading && (
          <div className="flex shrink-0 items-center justify-end gap-2">
            <button
              type="button"
              onClick={applyReload}
              className="inline-flex min-h-[44px] min-w-[5.5rem] items-center justify-center gap-1.5 rounded-xl bg-kal-accent px-3 py-2 text-xs font-bold uppercase tracking-wide text-kal-accent-foreground transition-colors hover:bg-kal-accent-hover active:scale-[0.98] motion-reduce:active:scale-100"
            >
              <RefreshCw className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Reload
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="min-h-[44px] rounded-lg px-3 py-2 text-xs font-semibold text-kal-muted transition-colors hover:bg-kal-card-muted hover:text-kal-text"
            >
              Later
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
