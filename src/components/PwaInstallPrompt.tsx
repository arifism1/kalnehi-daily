"use client";

import { Download, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { PwaIosInstallModal } from "@/components/PwaIosInstallModal";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { SITE_BRAND } from "@/lib/seo-metadata";

const STORAGE_PERMANENT_DISMISS = "has_dismissed_a2hs";
const STORAGE_TEMP_DISMISS_UNTIL = "kalnehi-pwa-dismiss-until";
const TEMP_DISMISS_DAYS = 7;

function readPermanentDismiss(): boolean {
  try {
    return localStorage.getItem(STORAGE_PERMANENT_DISMISS) === "1";
  } catch {
    return false;
  }
}

function writePermanentDismiss() {
  try {
    localStorage.setItem(STORAGE_PERMANENT_DISMISS, "1");
  } catch {
    /* ignore */
  }
}

function readTempDismiss(): boolean {
  try {
    const until = parseInt(localStorage.getItem(STORAGE_TEMP_DISMISS_UNTIL) ?? "0", 10);
    return until > Date.now();
  } catch {
    return false;
  }
}

function writeTempDismiss(days: number) {
  try {
    localStorage.setItem(
      STORAGE_TEMP_DISMISS_UNTIL,
      String(Date.now() + days * 24 * 60 * 60 * 1000),
    );
  } catch {
    /* ignore */
  }
}

/** iOS Share button — square with arrow pointing up (SF Symbols style). */
function IosShareIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M8.5 8.5 12 5l3.5 3.5" />
      <path d="M12 5v10" />
      <path d="M4 13v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
    </svg>
  );
}

export function PwaInstallPrompt() {
  const {
    installed,
    canPromptInstall,
    iosDevice,
    installEligibilityKnown,
    promptInstall,
  } = usePwaInstall();

  const [visible, setVisible] = useState(false);
  const [iosModalOpen, setIosModalOpen] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!installEligibilityKnown) return;
    if (installed) return;
    if (readPermanentDismiss()) return;
    if (readTempDismiss()) return;
    if (!canPromptInstall && !iosDevice) return;

    const id = window.setTimeout(() => setVisible(true), 1200);
    return () => window.clearTimeout(id);
  }, [installEligibilityKnown, installed, canPromptInstall, iosDevice]);

  useEffect(() => {
    if (!visible) {
      setEntered(false);
      return;
    }
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [visible]);

  const handleDontRemind = useCallback(() => {
    writePermanentDismiss();
    setVisible(false);
  }, []);

  const handleNotNow = useCallback(() => {
    writeTempDismiss(TEMP_DISMISS_DAYS);
    setVisible(false);
  }, []);

  const handleInstall = useCallback(async () => {
    const result = await promptInstall();
    if (result.ok && result.outcome === "accepted") {
      writePermanentDismiss();
      setVisible(false);
    } else {
      writeTempDismiss(TEMP_DISMISS_DAYS);
      setVisible(false);
    }
  }, [promptInstall]);

  if (!visible) return null;

  const isIos = iosDevice && !canPromptInstall;

  return (
    <>
      {/*
       * Mobile  (< md): full-width bottom sheet sliding up from the screen edge.
       * Desktop (≥ md): compact floating card anchored to the bottom-right corner.
       */}
      <div
        className="pointer-events-none fixed bottom-0 left-0 right-0 z-[100] flex justify-center md:left-auto md:right-6 md:bottom-6"
        role="region"
        aria-label="Install app"
      >
        <div
          className={[
            // Shared base
            "pointer-events-auto w-full border border-kal-border bg-kal-card/95 px-4 pt-3 backdrop-blur-md transition-all duration-300 ease-out motion-reduce:transition-none",
            // Mobile shape — full-width sheet with rounded top corners + safe-area bottom
            "max-w-md rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-4px_24px_rgba(0,0,0,0.10)]",
            // Desktop shape — narrow floating card, fully rounded
            "md:w-80 md:max-w-none md:rounded-2xl md:pb-4 md:shadow-2xl md:shadow-black/15",
            // Entrance animation: slide-up on mobile, fade+lift on desktop
            entered
              ? "translate-y-0 opacity-100"
              : "translate-y-full opacity-0 md:translate-y-3",
          ].join(" ")}
        >
          {/* Drag handle — mobile only */}
          <div className="mb-3 flex justify-center md:hidden" aria-hidden>
            <span className="h-1 w-10 rounded-full bg-kal-border" />
          </div>

          {/* Header row */}
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-kal-accent-soft text-kal-accent">
              <Download className="size-5" aria-hidden />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug text-kal-text">
                Install {SITE_BRAND} for the best experience
              </p>

              {isIos ? (
                <div className="mt-2 flex items-start gap-2 rounded-xl border border-kal-border/60 bg-kal-accent-soft/40 px-3 py-2.5">
                  <IosShareIcon className="mt-0.5 size-4 shrink-0 text-kal-accent" />
                  <p className="text-xs leading-relaxed text-kal-text-secondary">
                    Tap the{" "}
                    <span className="font-semibold text-kal-text">Share</span>{" "}
                    icon at the bottom, then scroll down and tap{" "}
                    <span className="font-semibold text-kal-text">
                      Add to Home Screen
                    </span>
                    .
                  </p>
                </div>
              ) : (
                <p className="mt-0.5 text-xs leading-snug text-kal-text-secondary">
                  Add to your home screen for faster load, offline-friendly
                  pages, and a distraction-free study experience.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleNotNow}
              className="flex size-9 shrink-0 items-center justify-center rounded-lg text-kal-muted transition-colors hover:bg-kal-card-muted hover:text-kal-text"
              aria-label="Dismiss for now"
            >
              <X className="size-4.5" strokeWidth={2} />
            </button>
          </div>

          {/* Action row */}
          <div className="mt-3 flex flex-col gap-2">
            {isIos ? (
              <button
                type="button"
                onClick={() => setIosModalOpen(true)}
                className="kal-btn-accent w-full"
              >
                Show Instructions
              </button>
            ) : (
              <button
                type="button"
                onClick={handleInstall}
                className="kal-btn-accent w-full"
              >
                <Download className="size-4" aria-hidden />
                Install App
              </button>
            )}

            <button
              type="button"
              onClick={handleDontRemind}
              className="py-1 text-xs text-kal-muted underline-offset-2 transition-colors hover:text-kal-text"
            >
              Don&apos;t remind me
            </button>
          </div>
        </div>
      </div>

      <PwaIosInstallModal
        open={iosModalOpen}
        onClose={() => {
          setIosModalOpen(false);
          writeTempDismiss(TEMP_DISMISS_DAYS);
          setVisible(false);
        }}
      />
    </>
  );
}
