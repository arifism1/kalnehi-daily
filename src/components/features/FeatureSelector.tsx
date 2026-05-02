"use client";

import clsx from "clsx";
import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { VISIBLE_DASHBOARD_FEATURES } from "@/lib/dashboardFeatures";

type FeatureSelectorProps = {
  selected: string[];
  onChange: (ids: string[]) => void;
  /** Rendered on the right of the select/deselect toolbar (e.g. Save). */
  toolbarEnd?: ReactNode;
};

export function FeatureSelector({ selected, onChange, toolbarEnd }: FeatureSelectorProps) {
  // Safety net: keep retired/internal features hidden even if stale data still references them.
  const visibleFeatures = VISIBLE_DASHBOARD_FEATURES.filter((feature) => feature.id !== "daily-log");
  const visibleFeatureIds = new Set(visibleFeatures.map((feature) => feature.id));
  const visibleSelectedCount = selected.filter((id) => visibleFeatureIds.has(id)).length;
  const allSelected = visibleSelectedCount === visibleFeatures.length;

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  function toggleAll() {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(visibleFeatures.map((f) => f.id));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Select all / Deselect all */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
        <p className="min-w-0 text-xs text-kal-text-secondary">
          <span className="font-semibold text-kal-accent">{visibleSelectedCount}</span> of{" "}
          {visibleFeatures.length} selected
        </p>
        <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={toggleAll}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-kal-accent transition-colors hover:bg-kal-accent/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-kal-accent/40"
          >
            {allSelected ? "Deselect All" : "Select All"}
          </button>
          {toolbarEnd}
        </div>
      </div>

      {/* Feature cards grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visibleFeatures.map((feature) => {
          const isOn = selected.includes(feature.id);
          const Icon = feature.icon;
          return (
            <button
              key={feature.id}
              type="button"
              onClick={() => toggle(feature.id)}
              aria-pressed={isOn}
              className={clsx(
                "group relative flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all duration-200",
                "bg-white/60 backdrop-blur-sm dark:bg-zinc-900/40",
                "shadow-[0_4px_16px_rgba(15,23,42,0.06)]",
                isOn
                  ? "border-kal-accent/50 shadow-[0_6px_20px_rgba(15,23,42,0.10)]"
                  : "border-kal-border/70 hover:border-kal-accent/30",
              )}
            >
              {/* Icon badge */}
              <span
                className={clsx(
                  "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors duration-200",
                  isOn
                    ? "border-kal-accent/40 bg-kal-accent/10 text-kal-accent"
                    : "border-kal-border/80 bg-white/70 text-kal-muted dark:bg-zinc-900/40",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </span>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <p
                  className={clsx(
                    "text-sm font-semibold leading-snug tracking-tight transition-colors duration-200",
                    isOn ? "text-kal-text" : "text-kal-text-secondary",
                  )}
                >
                  {feature.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-kal-muted">
                  {feature.description}
                </p>
              </div>

              {/* Check badge */}
              <span
                className={clsx(
                  "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200",
                  isOn
                    ? "border-kal-accent bg-kal-accent text-white"
                    : "border-kal-border/60 bg-transparent text-transparent",
                )}
              >
                <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
