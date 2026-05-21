"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import clsx from "clsx";

import {
  POWER_STEP_INDICES,
  TOTAL_STEPS,
  TOUR_STEPS,
  WORKFLOW_STEP_INDICES,
} from "./tourSteps";

type TourStepCardProps = {
  currentStep: number;
  onNext: () => void;
  onSkip: () => void;
};

/** Number of "feature" steps only (excludes welcome + celebration). */
const FEATURE_STEP_COUNT = TOTAL_STEPS - 2; // 12

function SegmentedProgress({ currentStep }: { currentStep: number }) {
  const powerCount = POWER_STEP_INDICES.length; // 5
  const workflowCount = WORKFLOW_STEP_INDICES.length; // 7

  // How many power / workflow steps are "done" at this step?
  const powerDone = POWER_STEP_INDICES.filter((i) => i < currentStep).length;
  const workflowDone = WORKFLOW_STEP_INDICES.filter(
    (i) => i < currentStep,
  ).length;

  const step = TOUR_STEPS[currentStep];
  const activeGroup = step?.group;

  return (
    <div className="flex w-full items-center gap-2">
      {/* Group 1 segment */}
      <div className="flex flex-col gap-1 flex-1">
        <span
          className={clsx(
            "text-[10px] font-semibold uppercase tracking-wider transition-colors",
            activeGroup === "power"
              ? "text-kal-accent"
              : activeGroup === "workflow"
                ? "text-kal-text/30"
                : "text-kal-text/40",
          )}
        >
          Power
        </span>
        <div className="flex gap-0.5">
          {Array.from({ length: powerCount }).map((_, i) => (
            <div
              key={i}
              className={clsx(
                "h-1 flex-1 rounded-full transition-all duration-300",
                i < powerDone
                  ? "bg-kal-accent"
                  : i === powerDone && activeGroup === "power"
                    ? "bg-kal-accent/50"
                    : "bg-kal-border/60",
              )}
            />
          ))}
        </div>
      </div>

      <div className="h-3 w-px bg-kal-border/50 shrink-0" />

      {/* Group 2 segment */}
      <div className="flex flex-col gap-1 flex-1">
        <span
          className={clsx(
            "text-[10px] font-semibold uppercase tracking-wider transition-colors",
            activeGroup === "workflow"
              ? "text-[#1D9E75]"
              : activeGroup === "power"
                ? "text-kal-text/30"
                : "text-kal-text/40",
          )}
        >
          Workflow
        </span>
        <div className="flex gap-0.5">
          {Array.from({ length: workflowCount }).map((_, i) => (
            <div
              key={i}
              className={clsx(
                "h-1 flex-1 rounded-full transition-all duration-300",
                i < workflowDone
                  ? "bg-[#1D9E75]"
                  : i === workflowDone && activeGroup === "workflow"
                    ? "bg-[#1D9E75]/50"
                    : "bg-kal-border/60",
              )}
            />
          ))}
        </div>
      </div>

      {/* Overall count */}
      <span className="shrink-0 text-[11px] text-kal-muted">
        {Math.min(currentStep - 1, FEATURE_STEP_COUNT)}/{FEATURE_STEP_COUNT}
      </span>
    </div>
  );
}

/**
 * Bottom-anchored floating step card shown during spotlight steps (1–12).
 * Animates in from below when a new step begins.
 */
export function TourStepCard({ currentStep, onNext, onSkip }: TourStepCardProps) {
  const step = TOUR_STEPS[currentStep];
  const isLastFeatureStep = currentStep === TOTAL_STEPS - 2; // step 12

  if (!step || step.group === null) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex justify-center px-4 pb-[calc(3.75rem+env(safe-area-inset-bottom)+0.75rem)]">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="pointer-events-auto w-full max-w-[420px] rounded-2xl border border-kal-border/60 bg-white/95 p-4 shadow-[0_8px_40px_rgba(0,0,0,0.18)] backdrop-blur-lg dark:bg-zinc-900/95"
        >
          {/* Group label */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <span
              className={clsx(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                step.group === "power"
                  ? "bg-kal-accent/10 text-kal-accent"
                  : "bg-[#1D9E75]/10 text-[#1D9E75]",
              )}
            >
              {step.group === "power" ? "The Power Features" : "The Workflow Engine"}
            </span>

            <button
              type="button"
              onClick={onSkip}
              aria-label="Skip tour"
              className="flex size-7 items-center justify-center rounded-full text-kal-muted transition-colors hover:bg-kal-border/40 hover:text-kal-text"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Title + description */}
          <p className="font-serif text-[17px] font-semibold leading-tight text-kal-text">
            {step.title}
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-kal-text-secondary">
            {step.description}
          </p>

          {/* Segmented progress + Next button */}
          <div className="mt-4 flex flex-col gap-3">
            <SegmentedProgress currentStep={currentStep} />

            <button
              type="button"
              onClick={onNext}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-kal-accent px-4 py-2.5 text-[14px] font-semibold text-white transition-opacity active:opacity-80"
            >
              {isLastFeatureStep ? "See the finish line" : "Next"}
              <ArrowRight className="size-4" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
