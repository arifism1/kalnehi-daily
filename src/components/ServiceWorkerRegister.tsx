"use client";

import { useEffect } from "react";

/**
 * Registers `/sw.js` in production so static assets and visited pages cache for
 * offline use. The merged worker (`scripts/merge-service-worker.mjs`) can inject
 * Firebase messaging for push when `NEXT_PUBLIC_FIREBASE_*` is set. Dev server
 * skips registration to avoid breaking HMR.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        if (cancelled) return;
        reg.addEventListener("updatefound", () => {
          const next = reg.installing;
          if (!next) return;
          next.addEventListener("statechange", () => {
            if (next.state === "installed" && navigator.serviceWorker.controller) {
              /* new version available — could show toast; keep silent for now */
            }
          });
        });
      })
      .catch(() => {
        /* ignore — private mode, blocked, etc. */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
