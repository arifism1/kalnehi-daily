"use client";

import clsx from "clsx";
import { ArrowRight, Home, PlusSquare, Share2, Sparkles, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { SITE_BRAND, SITE_NAME } from "@/lib/seo-metadata";

type PwaIosInstallModalProps = {
  open: boolean;
  onClose: () => void;
};

export function PwaIosInstallModal({ open, onClose }: PwaIosInstallModalProps) {
  const [entered, setEntered] = useState(false);
  const titleId = useId();

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
      aria-labelledby={titleId}
    >
      <button
        type="button"
        aria-label="Dismiss install instructions"
        className={clsx(
          "absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ease-out motion-reduce:transition-none",
          entered ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />
      <div
        className={clsx(
          "kal-glass-panel relative z-[1] w-full max-w-md overflow-hidden rounded-2xl shadow-2xl shadow-black/15 transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:translate-y-0 motion-reduce:opacity-100",
          entered
            ? "translate-y-0 opacity-100"
            : "translate-y-8 opacity-0 sm:translate-y-4",
        )}
      >
        {/* Decorative header strip */}
        <div
          className="h-1.5 w-full bg-gradient-to-r from-rose-300/90 via-kal-accent to-rose-400/80 dark:from-rose-500/50 dark:via-kal-accent dark:to-rose-600/40"
          aria-hidden
        />

        <div className="flex items-start justify-between gap-3 border-b border-white/15 p-4 backdrop-blur-sm sm:px-5 dark:border-white/10">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[0.6rem] font-semibold uppercase tracking-widest text-kal-accent">
              <Sparkles className="size-3 shrink-0" strokeWidth={2.5} aria-hidden />
              Safari on iPhone &amp; iPad
            </p>
            <h2
              id={titleId}
              className="mt-1 text-lg font-semibold leading-tight text-kal-text sm:text-xl"
            >
              Install App to Home Screen
            </h2>
            <p className="mt-1.5 text-sm text-kal-muted">
              Add {SITE_NAME} in a few taps — it opens full screen like a native app.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="kal-glass-subtle flex size-10 shrink-0 items-center justify-center rounded-xl text-kal-muted transition-colors hover:bg-kal-accent-soft/80 hover:text-kal-accent"
            aria-label="Close"
          >
            <X className="size-5" strokeWidth={2.25} />
          </button>
        </div>

        <div className="space-y-0 px-4 pb-2 pt-2 sm:px-5">
          <ol className="relative space-y-0">
            {/* Step 1 */}
            <li className="relative flex gap-3 pb-6 sm:gap-4">
              <div
                className="absolute left-[15px] top-10 bottom-0 w-px bg-gradient-to-b from-kal-accent/50 to-kal-accent/15 dark:from-kal-accent/35 dark:to-white/10"
                aria-hidden
              />
              <span className="relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-full bg-kal-accent text-[13px] font-bold text-white shadow-md shadow-kal-accent/25">
                1
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-semibold text-kal-text">
                  Tap the Share button in Safari
                </p>
                <p className="mt-1 text-xs leading-relaxed text-kal-muted">
                  Look at the bottom toolbar — it&apos;s the square with an arrow pointing up.
                </p>
                {/* Visual: faux Safari bar */}
                <div
                  className="mt-4 overflow-hidden rounded-2xl border border-black/10 bg-zinc-100 shadow-inner dark:border-white/10 dark:bg-zinc-900/80"
                  aria-hidden
                >
                  <div className="flex h-9 items-center justify-between border-b border-black/5 px-3 dark:border-white/10">
                    <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                      safari
                    </span>
                    <div className="h-1.5 w-16 rounded-full bg-zinc-300/80 dark:bg-zinc-600" />
                  </div>
                  <div className="flex h-[4.5rem] items-end justify-center bg-gradient-to-b from-zinc-200/80 to-zinc-100 pb-2 dark:from-zinc-800 dark:to-zinc-900">
                    <span
                      className={clsx(
                        "inline-flex size-12 items-center justify-center rounded-2xl bg-kal-accent text-white shadow-lg",
                        "motion-safe:animate-[pwa-share-nudge_2.4s_ease-in-out_infinite]",
                      )}
                    >
                      <Share2 className="size-6" strokeWidth={2} />
                    </span>
                  </div>
                </div>
              </div>
            </li>

            {/* Step 2 */}
            <li className="relative flex gap-3 pb-6 sm:gap-4">
              <div
                className="absolute left-[15px] top-10 bottom-0 w-px bg-gradient-to-b from-kal-accent/40 to-kal-accent/10 dark:from-kal-accent/25 dark:to-white/10"
                aria-hidden
              />
              <span className="relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-full bg-kal-accent text-[13px] font-bold text-white shadow-md shadow-kal-accent/25">
                2
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-semibold text-kal-text">
                  Scroll the menu, then tap{" "}
                  <span className="text-kal-accent-dark dark:text-kal-accent">
                    Add to Home Screen
                  </span>
                </p>
                <p className="mt-1 text-xs text-kal-muted">
                  You may need to swipe up on the share sheet to see all actions.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-kal-border/80 bg-kal-accent-soft/50 p-3 dark:border-white/10 dark:bg-red-950/25">
                  <span className="inline-flex items-center gap-2 rounded-lg border border-white/40 bg-white/90 px-2.5 py-1.5 text-[12px] font-semibold text-kal-text shadow-sm dark:border-white/10 dark:bg-zinc-800/90 dark:text-zinc-100">
                    <PlusSquare className="size-4 shrink-0 text-kal-accent" strokeWidth={2} />
                    Add to Home Screen
                  </span>
                  <ArrowRight className="hidden size-4 text-kal-muted sm:inline" aria-hidden />
                  <span className="text-[12px] text-kal-text-secondary">
                    Tap <span className="font-semibold text-kal-text">Add</span> to confirm
                  </span>
                </div>
              </div>
            </li>

            {/* Step 3 */}
            <li className="relative flex gap-3 pb-1 sm:gap-4">
              <span className="relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-full bg-kal-accent text-[13px] font-bold text-white shadow-md shadow-kal-accent/25">
                3
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-semibold text-kal-text">
                  Launch {SITE_BRAND} from your home screen
                </p>
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-dashed border-kal-accent/35 bg-white/50 p-3 dark:border-kal-accent/25 dark:bg-zinc-900/40">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-kal-accent-soft ring-2 ring-kal-accent/20 dark:bg-red-950/50">
                    <Home className="size-5 text-kal-accent-dark dark:text-kal-accent" strokeWidth={2.25} />
                  </span>
                  <p className="text-sm leading-snug text-kal-text-secondary">
                    You&apos;ll get a full-screen app icon — open it anytime for a focused,
                    app-like experience.
                  </p>
                </div>
              </div>
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
