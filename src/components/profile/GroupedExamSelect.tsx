"use client";

import clsx from "clsx";
import { ChevronRight } from "lucide-react";

import type { ExamCatalogRow } from "@/lib/examsCatalog";
import { groupExamRowsForSelect } from "@/lib/examCatalogGroups";

type Props = {
  id: string;
  value: string;
  onChange: (examName: string) => void;
  options: ExamCatalogRow[];
  /** When true, first option is empty "Select…". */
  placeholder?: boolean;
  className?: string;
  wrapperClassName?: string;
  chevronClassName?: string;
};

export function GroupedExamSelect({
  id,
  value,
  onChange,
  options,
  placeholder = false,
  className,
  wrapperClassName,
  chevronClassName,
}: Props) {
  const grouped = groupExamRowsForSelect(options);

  return (
    <div className={clsx("relative min-w-0 w-full flex-1", wrapperClassName)}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={
          className ??
          "w-full appearance-none rounded-lg border border-kal-border bg-kal-card-muted py-2.5 pr-10 pl-3 text-base text-kal-text focus:border-kal-accent/40 focus:outline-none focus:ring-2 focus:ring-kal-accent/20"
        }
      >
        {placeholder ? <option value="">Select…</option> : null}
        {grouped.map(({ group, rows }) => (
          <optgroup key={group} label={group}>
            {rows.map((opt) => (
              <option key={opt.exam_name} value={opt.exam_name}>
                {opt.display_name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <ChevronRight
        className={
          chevronClassName ??
          "pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 rotate-90 text-kal-muted"
        }
        aria-hidden
      />
    </div>
  );
}
