"use client";

import { Mic, Type, X } from "lucide-react";

import { DailyPlanTypedQuickAdd } from "@/components/planner/DailyPlanTypedQuickAdd";
import { AiFeatureGate } from "@/components/subscription/AiFeatureGate";
import { KalModalShell } from "@/components/ui/KalModalShell";
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
  if (!mode) return null;

  const { label, Icon } = MODE_META[mode];

  return (
    <KalModalShell
      onClose={onClose}
      zIndex={90}
      ariaLabel={label}
      panelClassName="max-w-2xl max-h-[min(var(--kal-sheet-max-h,92dvh),56rem)] sm:max-h-[min(90dvh,56rem)] sm:rounded-2xl bg-kal-card"
      scrollClassName="px-5 py-6 sm:px-6"
      header={
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
      }
    >
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
    </KalModalShell>
  );
}
