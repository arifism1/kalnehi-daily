"use client";

import { useEffect, useState } from "react";

/**
 * Registers `/sw.js` in production so static assets and visited pages cache for
 * offline use. The merged worker (`scripts/merge-service-worker.mjs`) can inject
 * Firebase messaging for push when `NEXT_PUBLIC_FIREBASE_*` is set. Dev server
 * skips registration to avoid breaking HMR.
 *
 * The SW already calls self.skipWaiting() on install, so new versions activate
 * automatically. We listen for `controllerchange` (new SW has taken over) and
 * show a toast so users can reload at a convenient moment rather than losing work.
 */
export function ServiceWorkerRegister() {
  const [updateReady, setUpdateReady] = useState(false);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    // Only show the "updated" toast if a SW was already controlling the page.
    // On a fresh install the controller starts null, so controllerchange fires
    // the first time but we don't want to nudge the user to reload immediately.
    const hadController = !!navigator.serviceWorker.controller;

    const onControllerChange = () => {
      if (hadController) setUpdateReady(true);
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    let cancelled = false;
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        /* ignore — private mode, blocked, etc. */
      });

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      // satisfy linter — cancelled is read conceptually by the registration branch
      void cancelled;
    };
  }, []);

  if (!updateReady) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[95] flex justify-center px-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4 sm:pb-6"
    >
      <div className="kal-glass-panel pointer-events-auto flex w-full max-w-lg items-center gap-3 rounded-2xl px-5 py-4">
        <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-kal-text">
          {reloading ? "Reloading…" : "App updated — tap to get the latest version"}
        </p>
        {!reloading && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setReloading(true);
                window.location.reload();
              }}
              className="rounded-xl bg-kal-accent px-3 py-2 text-xs font-bold uppercase tracking-wide text-kal-accent-foreground transition-colors hover:bg-kal-accent-hover active:scale-[0.98]"
            >
              Reload
            </button>
            <button
              type="button"
              onClick={() => setUpdateReady(false)}
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
