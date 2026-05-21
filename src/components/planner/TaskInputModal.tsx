"use client";

import { Mic, Type, X } from "lucide-react";
import { useEffect } from "react";

import { DailyPlanTypedQuickAdd } from "@/components/planner/DailyPlanTypedQuickAdd";
import { AiFeatureGate } from "@/components/subscription/AiFeatureGate";
import { DictateMyDay } from "@/components/voice/DictateMyDay";

export type TaskInputMode = "dictate" | "self-type";

type Props = {
  mode: TaskInputMode | null;
  planDate: string;
  onClose: () => void;
};

const MODE_META: Record<
  TaskInputMode,
  { label: string; Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }> }
> = {
  dictate: { label: "Dictate My Day", Icon: Mic },
  "self-type": { label: "Self Type", Icon: Type },
};

export function TaskInputModal({ mode, planDate, onClose }: Props) {
  useEffect(() => {
    if (!mode) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mode]);

  useEffect(() => {
    if (!mode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mode, onClose]);

  if (!mode) return null;

  const { label, Icon } = MODE_META[mode];

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/65"
        onClick={onClose}
      />

      {/* Panel — bottom sheet on mobile, centered card on desktop */}
      <div
        className="relative z-10 flex min-h-0 w-full max-w-2xl max-h-[min(92dvh,56rem)] flex-col overflow-hidden rounded-t-2xl border border-kal-border bg-kal-card kal-shadow-card sm:max-h-[min(90dvh,56rem)] sm:rounded-2xl"
      >
        {/* Sticky header */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-kal-border bg-kal-card px-5 py-3.5 sm:px-6">
          <div className="flex items-center gap-2">
            <Icon className="size-4 text-kal-accent" aria-hidden />
            <p className="text-sm font-bold text-kal-text">{label}</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-kal-muted transition-colors hover:bg-kal-card-muted hover:text-kal-text"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-6">
          {mode === "dictate" ? (
            <AiFeatureGate>
              <DictateMyDay
                urlInitialPlanDate={planDate}
                hideLivePlan
                compact
                onCommitted={onClose}
              />
            </AiFeatureGate>
          ) : (
            <DailyPlanTypedQuickAdd planDate={planDate} onAdded={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}
