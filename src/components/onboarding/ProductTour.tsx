"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  PRODUCT_TOUR_STEPS,
  type TourStep,
  type TourStepPosition,
} from "@/lib/productTourSteps";

import * as storage from "@/lib/storage";

// ─── Storage helpers ──────────────────────────────────────────────────────────

const TOUR_PENDING_KEY = "kalnehi_product_tour_pending_v1";
const TOUR_DONE_KEY = "kalnehi_product_tour_v1";

/** Call this right before redirecting to /home after onboarding completes. */
export async function writeProductTourPending(): Promise<void> {
  try {
    await storage.setItem(TOUR_PENDING_KEY, "1");
  } catch {
    // ignore — storage may be unavailable
  }
}

/** Returns true if the tour should be shown (pending and not yet completed). */
export async function readProductTourPending(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const pending = await storage.getItem(TOUR_PENDING_KEY);
    const done = await storage.getItem(TOUR_DONE_KEY);
    return pending === "1" && done !== "done";
  } catch {
    return false;
  }
}

async function markTourDone(): Promise<void> {
  try {
    await storage.setItem(TOUR_DONE_KEY, "done");
    await storage.removeItem(TOUR_PENDING_KEY);
  } catch {
    // ignore
  }
}

// ─── Element measurement ─────────────────────────────────────────────────────

type Rect = { top: number; left: number; width: number; height: number };
type MeasureResult = { rect: Rect; usedMobile: boolean } | null;

function measureTarget(tourId: string, mobileTourId?: string): MeasureResult {
  const tryEl = (id: string): Rect | null => {
    const el = document.querySelector<HTMLElement>(`[data-tour="${id}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    // Element is hidden (display:none, visibility:hidden, or 0-size)
    if (r.width === 0 || r.height === 0) return null;
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  };

  const primary = tryEl(tourId);
  if (primary) return { rect: primary, usedMobile: false };

  if (mobileTourId) {
    const mobile = tryEl(mobileTourId);
    if (mobile) return { rect: mobile, usedMobile: true };
  }

  return null;
}

// ─── Tooltip positioning ──────────────────────────────────────────────────────

const CARD_WIDTH = 296;
const CARD_HEIGHT_EST = 180;
const GAP = 14;
// Safe viewport margins to ensure cards never clip at edges
const EDGE_PAD = 10;

function computeTooltipStyle(
  rect: Rect | null,
  position: TourStepPosition,
): React.CSSProperties {
  // Shared safe-width that never overflows the viewport
  const safeWidth = `min(${CARD_WIDTH}px, calc(100vw - ${EDGE_PAD * 2}px))`;

  if (!rect || position === "center") {
    return {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: safeWidth,
      zIndex: 9999,
    };
  }

  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;

  const clampLeft = (l: number) =>
    Math.max(EDGE_PAD, Math.min(l, vw - CARD_WIDTH - EDGE_PAD));
  const clampTop = (t: number) =>
    Math.max(EDGE_PAD, Math.min(t, vh - CARD_HEIGHT_EST - EDGE_PAD));

  const centeredLeft = clampLeft(rect.left + rect.width / 2 - CARD_WIDTH / 2);
  const middleTop = clampTop(rect.top + rect.height / 2 - CARD_HEIGHT_EST / 2);

  // "bottom" position: if tooltip would go offscreen downward, flip above instead
  const bottomTop = rect.top + rect.height + GAP;
  const flipToTop = bottomTop + CARD_HEIGHT_EST > vh - EDGE_PAD;

  // "top" position: if tooltip would go offscreen upward, flip below instead
  const topTop = rect.top - CARD_HEIGHT_EST - GAP;
  const flipToBottom = topTop < EDGE_PAD;

  switch (position) {
    case "right":
      return {
        position: "fixed",
        top: middleTop,
        // If tooltip would overflow the right edge, flip left of element
        left: clampLeft(rect.left + rect.width + GAP),
        width: safeWidth,
        zIndex: 9999,
      };
    case "left":
      return {
        position: "fixed",
        top: middleTop,
        left: Math.max(EDGE_PAD, rect.left - CARD_WIDTH - GAP),
        width: safeWidth,
        zIndex: 9999,
      };
    case "bottom":
      return {
        position: "fixed",
        top: flipToTop
          ? clampTop(rect.top - CARD_HEIGHT_EST - GAP)
          : clampTop(bottomTop),
        left: centeredLeft,
        width: safeWidth,
        zIndex: 9999,
      };
    case "top":
      return {
        position: "fixed",
        top: flipToBottom
          ? clampTop(rect.top + rect.height + GAP)
          : clampTop(topTop),
        left: centeredLeft,
        width: safeWidth,
        zIndex: 9999,
      };
    default:
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: safeWidth,
        zIndex: 9999,
      };
  }
}

// ─── Tour card ────────────────────────────────────────────────────────────────

function TourCard({
  step,
  stepIdx,
  total,
  rect,
  usedMobile,
  onNext,
  onSkip,
}: {
  step: TourStep;
  stepIdx: number;
  total: number;
  rect: Rect | null;
  usedMobile: boolean;
  onNext: () => void;
  onSkip: () => void;
}) {
  const isLast = stepIdx === total - 1;
  const effectivePosition =
    usedMobile && step.mobilePosition ? step.mobilePosition : step.position;
  const effectiveDescription =
    usedMobile && step.mobileDescription
      ? step.mobileDescription
      : step.description;
  const tooltipStyle = computeTooltipStyle(rect, effectivePosition);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.93, y: -4 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      style={tooltipStyle}
      className="rounded-2xl bg-white shadow-2xl ring-1 ring-black/[0.08] dark:bg-zinc-900 dark:ring-white/10"
      role="dialog"
      aria-modal="true"
      aria-label={`Tour: ${step.title}`}
    >
      <div className="p-5">
        {/* Header row */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-600/80 dark:text-amber-400/80">
            Step {stepIdx + 1} of {total}
          </span>
          <button
            type="button"
            onClick={onSkip}
            aria-label="Skip tour"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>

        {/* Content */}
        <h2 className="text-[15px] font-semibold leading-snug text-zinc-900 dark:text-white">
          {step.title}
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">
          {effectiveDescription}
        </p>

        {/* Footer: progress dots + action button */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5" aria-hidden>
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className="h-1.5 rounded-full transition-all duration-200"
                style={{
                  width: i === stepIdx ? "16px" : "6px",
                  background:
                    i === stepIdx
                      ? "rgba(186,117,23,0.95)"
                      : "rgba(0,0,0,0.15)",
                }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onNext}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-amber-500 px-4 text-[13px] font-semibold text-zinc-950 shadow-sm transition-transform hover:bg-amber-400 active:scale-[0.97]"
          >
            {isLast ? (
              "Start exploring"
            ) : (
              <>
                Next
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Inner tour (rendered inside portal) ─────────────────────────────────────

function ProductTourInner({ onComplete }: { onComplete: () => void }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [measureResult, setMeasureResult] = useState<MeasureResult>(null);

  // Lock body scroll while the tour is active
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Re-measure target element whenever the step changes
  useEffect(() => {
    const step = PRODUCT_TOUR_STEPS[stepIdx];
    if (!step.target) {
      setMeasureResult(null);
      return;
    }

    let rafId: number;
    const measure = () => {
      setMeasureResult(measureTarget(step.target!, step.mobileTarget));
    };

    // rAF ensures layout has settled before measuring
    rafId = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", measure);
    };
  }, [stepIdx]);

  const finishTour = useCallback(() => {
    void markTourDone();
    onComplete();
  }, [onComplete]);

  const handleNext = useCallback(() => {
    if (stepIdx < PRODUCT_TOUR_STEPS.length - 1) {
      setStepIdx((i) => i + 1);
    } else {
      finishTour();
    }
  }, [stepIdx, finishTour]);

  const step = PRODUCT_TOUR_STEPS[stepIdx];
  const rect = measureResult?.rect ?? null;
  const usedMobile = measureResult?.usedMobile ?? false;

  return (
    <>
      {/* Full-screen dim layer (shown when there is no targeted spotlight) */}
      {!rect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9990] bg-black/60"
          aria-hidden
        />
      )}

      {/* Spotlight — a transparent box whose outer box-shadow dims the rest of the screen */}
      {rect && (
        <motion.div
          key={`spotlight-${stepIdx}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          aria-hidden
          style={{
            position: "fixed",
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            zIndex: 9991,
            borderRadius: 12,
            pointerEvents: "none",
            // The massive outer shadow dims everything outside the spotlight;
            // the amber ring adds a subtle highlight around the element.
            boxShadow:
              "0 0 0 4000px rgba(0,0,0,0.62), 0 0 0 2px rgba(239,159,39,0.65)",
          }}
        />
      )}

      {/* Tooltip card with step content */}
      <AnimatePresence mode="wait">
        <TourCard
          key={step.id}
          step={step}
          stepIdx={stepIdx}
          total={PRODUCT_TOUR_STEPS.length}
          rect={rect}
          usedMobile={usedMobile}
          onNext={handleNext}
          onSkip={finishTour}
        />
      </AnimatePresence>
    </>
  );
}

// ─── Public component (portal wrapper) ───────────────────────────────────────

type ProductTourProps = {
  onComplete: () => void;
};

/**
 * Renders an animated product tour as a portal over the entire page.
 * Mount this after the user completes onboarding and lands on /home.
 * Automatically marks the tour as done in localStorage on finish or skip.
 */
export function ProductTour({ onComplete }: ProductTourProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return createPortal(
    <ProductTourInner onComplete={onComplete} />,
    document.body,
  );
}
