"use client";

import clsx from "clsx";

type DoubtTopicSelectProps = {
  id: string;
  label?: string;
  value: string;
  onChange: (next: string) => void;
  options: string[];
  disabled?: boolean;
  className?: string;
};

export function DoubtTopicSelect({
  id,
  label = "Topic / chapter (optional)",
  value,
  onChange,
  options,
  disabled,
  className,
}: DoubtTopicSelectProps) {
  return (
    <div className={clsx("block", className)}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-kal-muted">
          {label}
        </label>
        {value && options.length > 0 ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange("")}
            className="text-[11px] font-medium text-kal-muted hover:text-kal-text disabled:opacity-40"
          >
            Clear
          </button>
        ) : null}
      </div>
      <p className="mt-0.5 text-[11px] leading-snug text-kal-text-secondary">
        Pick a syllabus microtopic when you know it — or leave as &quot;No
        topic&quot;.
      </p>
      <select
        id={id}
        value={value}
        disabled={disabled || options.length === 0}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 min-h-[48px] w-full appearance-none rounded-xl border border-kal-border bg-kal-input-bg p-3 pr-10 text-base text-kal-text outline-none focus-visible:ring-2 focus-visible:ring-kal-accent/40 disabled:opacity-50 dark:bg-kal-input-bg"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.75rem center",
        }}
      >
        <option value="">No topic</option>
        {options.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {options.length === 0 ? (
        <p className="mt-1 text-[11px] text-kal-muted">
          Choose a subject first to load syllabus topics.
        </p>
      ) : null}
    </div>
  );
}
