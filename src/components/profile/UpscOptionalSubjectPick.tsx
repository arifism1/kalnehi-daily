"use client";

import { ChevronRight } from "lucide-react";

type Props = {
  options: string[];
  /** Base optional name, e.g. "Anthropology", or "" for None. */
  selected: string;
  onChange: (next: string) => void;
  disabled?: boolean;
};

export function UpscOptionalSubjectPick({
  options,
  selected,
  onChange,
  disabled,
}: Props) {
  return (
    <div className="relative min-w-0 w-full flex-1">
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="min-h-[48px] w-full appearance-none rounded-xl border border-kal-border bg-kal-card-muted px-4 py-3 text-base text-kal-text transition-colors duration-200 focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20 disabled:pointer-events-none disabled:opacity-50"
      >
        <option value="">None / Not selected yet</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <ChevronRight
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 rotate-90 text-kal-muted"
        aria-hidden
      />
    </div>
  );
}
