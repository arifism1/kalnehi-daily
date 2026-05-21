"use client";

import { CalendarDays } from "lucide-react";
import clsx from "clsx";
import { useRef } from "react";

type DateFilterNativeInputProps = {
  min: string;
  max: string;
  onSelect: (ymd: string) => void;
  /** Highlight when a non-preset calendar day is selected (e.g. custom from picker). */
  active?: boolean;
  disabled?: boolean;
  className?: string;
};

/**
 * Native date picker triggered by a button (showPicker when available).
 * min/max are yyyy-MM-dd.
 */
const pillActive =
  "border-kal-accent bg-kal-accent/10 text-kal-text hover:border-kal-accent hover:text-kal-text";
const pillIdle =
  "border-kal-border/70 bg-white/50 text-kal-muted hover:border-kal-accent/40 hover:text-kal-text dark:bg-zinc-900/50";

export function DateFilterNativeInput({
  min,
  max,
  onSelect,
  active = false,
  disabled,
  className,
}: DateFilterNativeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={clsx("relative inline-flex shrink-0", className)}>
      <input
        ref={inputRef}
        type="date"
        className="pointer-events-none absolute inset-0 opacity-0"
        min={min}
        max={max}
        disabled={disabled}
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          const v = e.target.value;
          if (v) onSelect(v);
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          const el = inputRef.current;
          if (!el) return;
          if (typeof el.showPicker === "function") {
            el.showPicker();
            return;
          }
          el.click();
        }}
        className={clsx(
          "inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
          active ? pillActive : pillIdle,
          disabled && "pointer-events-none opacity-50",
        )}
        aria-label="Pick date from calendar"
      >
        <CalendarDays className="size-3.5 shrink-0" aria-hidden />
        <span className="hidden min-[360px]:inline">Pick date</span>
      </button>
    </div>
  );
}
