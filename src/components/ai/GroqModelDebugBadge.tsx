"use client";

import { groqModelBadgeFromId } from "@/lib/groqModelBadge";

type GroqModelDebugBadgeProps = {
  modelId: string | null;
  /** When false, nothing is rendered (e.g. not dev and no ?debug=true). */
  visible: boolean;
  /** e.g. "PrepBrain" for console logging context */
  logPrefix?: string;
};

export function GroqModelDebugBadge({
  modelId,
  visible,
  logPrefix = "AI",
}: GroqModelDebugBadgeProps) {
  if (!visible || !modelId?.trim()) return null;

  const { label, kind } = groqModelBadgeFromId(modelId);
  const color =
    kind === "8b_orange"
      ? "bg-orange-500/15 text-orange-900 ring-orange-500/35 dark:text-orange-100 dark:ring-orange-400/40"
      : kind === "70b_green"
        ? "bg-emerald-500/15 text-emerald-900 ring-emerald-500/35 dark:text-emerald-100 dark:ring-emerald-400/40"
        : "bg-kal-card-muted text-kal-text-secondary ring-kal-border";

  return (
    <p
      className={`mt-1.5 inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight ring-1 ring-inset ${color}`}
      title={`${logPrefix} Groq model: ${modelId}`}
    >
      {label}
    </p>
  );
}
