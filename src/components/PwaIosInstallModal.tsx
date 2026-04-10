"use client";

import clsx from "clsx";
import { ArrowRight, PlusSquare, Share2, X } from "lucide-react";
import { useEffect, useState } from "react";

type PwaIosInstallModalProps = {
  open: boolean;
  onClose: () => void;
};

export function PwaIosInstallModal({ open, onClose }: PwaIosInstallModalProps) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-ios-install-title"
    >
      <button
        type="button"
        aria-label="Dismiss install instructions"
        className={clsx(
          "absolute inset-0 bg-black/45 transition-opacity duration-300 ease-out motion-reduce:transition-none",
          entered ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />
      <div
        className={clsx(
          "relative z-[1] w-full max-w-md overflow-hidden rounded-2xl border border-kal-border bg-kal-card kal-shadow-card transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:translate-y-0 motion-reduce:opacity-100",
          entered
            ? "translate-y-0 opacity-100"
            : "translate-y-8 opacity-0 sm:translate-y-4",
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-kal-border px-4 py-3 sm:px-5">
          <div>
            <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-kal-accent">
              Install
            </p>
            <h2
              id="pwa-ios-install-title"
              className="text-base font-semibold text-kal-text sm:text-lg"
            >
              Add to Home Screen
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-kal-border bg-kal-card-muted text-kal-muted transition-colors hover:bg-kal-accent-soft hover:text-kal-accent"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
          <p className="text-sm leading-relaxed text-kal-muted">
            Install Kalnehi Daily like a native app — one tap from your home
            screen.
          </p>

          <ol className="space-y-3">
            <li className="flex gap-3 rounded-xl border border-kal-border bg-kal-accent-soft/40 px-3 py-3 sm:gap-4 sm:px-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-kal-accent/20 text-xs font-bold text-kal-accent-dark dark:text-kal-accent">
                1
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-kal-text">
                  Tap the Share button
                </p>
                <p className="mt-1 text-xs text-kal-muted">
                  At the bottom of Safari (square with arrow up).
                </p>
                <div className="mt-3 flex justify-center sm:justify-start">
                  <span
                    className={clsx(
                      "inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-kal-accent text-white shadow-md",
                      "motion-safe:animate-[pwa-share-nudge_2.4s_ease-in-out_infinite]",
                    )}
                    aria-hidden
                  >
                    <Share2 className="h-7 w-7" strokeWidth={2} />
                  </span>
                </div>
              </div>
            </li>

            <li className="flex items-start gap-3 rounded-xl border border-kal-border bg-kal-card-muted/80 px-3 py-3 sm:gap-4 sm:px-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-kal-accent/20 text-xs font-bold text-kal-accent-dark dark:text-kal-accent">
                2
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-kal-text">
                  Scroll and tap{" "}
                  <span className="text-kal-accent-dark dark:text-kal-accent">
                    Add to Home Screen
                  </span>
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-kal-muted">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-kal-border bg-kal-card px-2 py-1 text-[11px] font-medium text-kal-text-secondary">
                    <PlusSquare className="h-3.5 w-3.5 text-kal-accent" />
                    Add to Home Screen
                  </span>
                  <ArrowRight className="hidden h-4 w-4 shrink-0 sm:inline" />
                  <span className="text-[11px]">Confirm with Add</span>
                </div>
              </div>
            </li>

            <li className="flex gap-3 rounded-xl border border-kal-border px-3 py-3 sm:gap-4 sm:px-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-kal-accent/20 text-xs font-bold text-kal-accent-dark dark:text-kal-accent">
                3
              </span>
              <p className="text-sm leading-relaxed text-kal-text-secondary">
                Open <span className="font-semibold text-kal-text">Kalnehi</span>{" "}
                from your home screen anytime — full screen, quick launch.
              </p>
            </li>
          </ol>
        </div>

        <div className="border-t border-kal-border px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[48px] rounded-xl bg-kal-accent px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-kal-accent-hover active:scale-[0.99] motion-reduce:active:scale-100"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
