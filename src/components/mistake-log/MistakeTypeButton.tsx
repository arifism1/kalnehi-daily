"use client";

import clsx from "clsx";
import { BookOpen, Brain, Clock, Zap } from "lucide-react";

import type { MistakeType } from "@/actions/mistakeLogs";

type MistakeTypeMeta = {
  type: MistakeType;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  selectedClass: string;
};

export const MISTAKE_TYPES: MistakeTypeMeta[] = [
  {
    type: "knowledge_gap",
    label: "Knowledge Gap",
    sublabel: "Didn't know the concept",
    icon: BookOpen,
    colorClass: "text-red-600 dark:text-red-400",
    selectedClass:
      "border-red-500 bg-red-50 ring-1 ring-red-500/20 dark:border-red-500 dark:bg-red-950/50 dark:ring-red-500/20",
  },
  {
    type: "application_error",
    label: "Application Error",
    sublabel: "Knew it but applied wrong",
    icon: Brain,
    colorClass: "text-orange-600 dark:text-orange-400",
    selectedClass:
      "border-orange-500 bg-orange-50 ring-1 ring-orange-500/20 dark:border-orange-500 dark:bg-orange-950/50 dark:ring-orange-500/20",
  },
  {
    type: "careless",
    label: "Careless Mistake",
    sublabel: "Knew it, rushed through it",
    icon: Zap,
    colorClass: "text-yellow-600 dark:text-yellow-400",
    selectedClass:
      "border-yellow-500 bg-yellow-50 ring-1 ring-yellow-500/20 dark:border-yellow-500 dark:bg-yellow-950/50 dark:ring-yellow-500/20",
  },
  {
    type: "time_pressure",
    label: "Time Pressure",
    sublabel: "Ran out of time",
    icon: Clock,
    colorClass: "text-violet-600 dark:text-violet-400",
    selectedClass:
      "border-violet-500 bg-violet-50 ring-1 ring-violet-500/20 dark:border-violet-500 dark:bg-violet-950/50 dark:ring-violet-500/20",
  },
];

type Props = {
  value: MistakeType | null;
  onChange: (type: MistakeType) => void;
  disabled?: boolean;
};

export function MistakeTypeGrid({ value, onChange, disabled }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {MISTAKE_TYPES.map(({ type, label, sublabel, icon: Icon, colorClass, selectedClass }) => {
        const selected = value === type;
        return (
          <button
            key={type}
            type="button"
            disabled={disabled}
            onClick={() => onChange(type)}
            className={clsx(
              "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors disabled:opacity-50",
              selected
                ? selectedClass
                : "border-zinc-300/95 bg-zinc-100/90 text-zinc-900 hover:border-kal-accent/50 dark:border-zinc-600 dark:bg-zinc-800/90 dark:text-zinc-100",
            )}
          >
            <Icon className={clsx("size-4 shrink-0", colorClass)} aria-hidden />
            <span
              className={clsx(
                "text-sm font-semibold leading-tight",
                selected ? "text-zinc-950 dark:text-zinc-50" : "text-zinc-900 dark:text-zinc-100",
              )}
            >
              {label}
            </span>
            <span
              className={clsx(
                "text-xs leading-tight",
                selected
                  ? "text-zinc-800 dark:text-zinc-200"
                  : "text-zinc-600 dark:text-zinc-400",
              )}
            >
              {sublabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}
