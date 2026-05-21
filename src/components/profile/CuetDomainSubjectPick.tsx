"use client";

import clsx from "clsx";

import { CUET_DOMAIN_SUBJECT_OPTIONS } from "@/lib/cuetDomainSubjects";

type Props = {
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
};

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export function CuetDomainSubjectPick({
  selected,
  onChange,
  disabled,
}: Props) {
  const selectedSet = new Set(selected.map(norm));

  const toggle = (label: string) => {
    const k = norm(label);
    const next = new Set(selected.map(norm));
    if (next.has(k)) {
      onChange(selected.filter((s) => norm(s) !== k));
    } else {
      onChange([...selected, label]);
    }
  };

  return (
    <div
      className="grid grid-cols-1 gap-2 sm:grid-cols-2"
      role="group"
      aria-label="CUET domain subjects"
    >
      {CUET_DOMAIN_SUBJECT_OPTIONS.map((opt) => {
        const on = selectedSet.has(norm(opt));
        return (
          <label
            key={opt}
            className={clsx(
              "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
              on
                ? "border-kal-accent/45 bg-kal-accent-soft"
                : "border-kal-border bg-kal-card-muted hover:border-kal-accent/25",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            <input
              type="checkbox"
              checked={on}
              disabled={disabled}
              onChange={() => toggle(opt)}
              className="size-4 rounded border-kal-border bg-kal-card text-kal-accent focus:ring-kal-accent/40"
            />
            <span className="text-[15px] font-medium text-kal-text">{opt}</span>
          </label>
        );
      })}
    </div>
  );
}
