"use client";

import clsx from "clsx";
import { Check } from "lucide-react";

import type { ExamTrack } from "@/lib/examTracks";
import { EXAM_TRACKS } from "@/lib/examTracks";
import type { ExamCatalogRow } from "@/lib/examsCatalog";
import { displayNameForExamCatalog } from "@/lib/examsCatalog";

interface TrackPickerProps {
  selected: ExamTrack | null;
  onSelect: (track: ExamTrack) => void;
  catalog: ExamCatalogRow[];
  disabled?: boolean;
}

export function TrackPicker({ selected, onSelect, catalog, disabled }: TrackPickerProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {EXAM_TRACKS.map((track) => {
        const isSelected = selected?.id === track.id;
        return (
          <button
            key={track.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(track)}
            className={clsx(
              "flex w-full flex-col gap-1 rounded-xl border p-3 text-left transition-all duration-150 disabled:pointer-events-none disabled:opacity-40",
              isSelected
                ? "border-kal-accent bg-kal-accent/10 ring-1 ring-kal-accent/40"
                : "border-kal-border bg-kal-card-muted hover:border-kal-accent/50 hover:bg-kal-accent/5",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-kal-text">{track.name}</span>
              {isSelected && (
                <Check className="size-4 shrink-0 text-kal-accent" />
              )}
            </div>
            <p className="text-[11px] leading-snug text-kal-text-secondary">
              {track.examNames
                .map((name) => displayNameForExamCatalog(name, catalog) || name)
                .join(" → ")}
            </p>
          </button>
        );
      })}
    </div>
  );
}

interface TrackConfirmationProps {
  track: ExamTrack;
  catalog: ExamCatalogRow[];
  onConfirm: () => void;
  onChange: () => void;
  disabled?: boolean;
}

export function TrackConfirmation({
  track,
  catalog,
  onConfirm,
  onChange,
  disabled,
}: TrackConfirmationProps) {
  const examDisplayNames = track.examNames.map(
    (name) => displayNameForExamCatalog(name, catalog) || name,
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-kal-accent/30 bg-kal-accent/5 p-4">
        <p className="text-sm font-semibold text-kal-text">
          You have selected{" "}
          <span className="text-kal-accent">{track.name}</span>.
        </p>
        <p className="mt-2 text-sm text-kal-text-secondary">
          This includes the following exams:
        </p>
        <ul className="mt-2 flex flex-col gap-1">
          {examDisplayNames.map((name, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-kal-text">
              <span className="size-1.5 shrink-0 rounded-full bg-kal-accent" />
              {name}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={onConfirm}
          className="kal-btn-accent flex min-h-[48px] items-center justify-center rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
        >
          Confirm
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onChange}
          className="flex min-h-[44px] items-center justify-center rounded-xl border border-kal-border bg-transparent py-2.5 text-sm font-medium text-kal-text-secondary hover:text-kal-text disabled:pointer-events-none disabled:opacity-50"
        >
          Change Track
        </button>
      </div>
    </div>
  );
}
