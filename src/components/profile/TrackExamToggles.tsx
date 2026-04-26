"use client";

import clsx from "clsx";

import type { ExamTrack } from "@/lib/examTracks";
import type { ExamCatalogRow } from "@/lib/examsCatalog";
import { displayNameForExamCatalog } from "@/lib/examsCatalog";

interface TrackExamTogglesProps {
  track: ExamTrack;
  enabledExams: string[];
  onChange: (enabled: string[]) => void;
  catalog: ExamCatalogRow[];
  disabled?: boolean;
}

/**
 * Checkbox list that lets the user enable/disable individual exams within
 * their track. At least one exam must remain enabled.
 */
export function TrackExamToggles({
  track,
  enabledExams,
  onChange,
  catalog,
  disabled,
}: TrackExamTogglesProps) {
  const toggle = (examName: string) => {
    const isCurrentlyEnabled = enabledExams.includes(examName);
    if (isCurrentlyEnabled && enabledExams.length === 1) return; // keep at least one
    const next = isCurrentlyEnabled
      ? enabledExams.filter((e) => e !== examName)
      : [...enabledExams, examName];
    // Preserve track order
    onChange(track.examNames.filter((name) => next.includes(name)));
  };

  return (
    <div className="flex flex-col gap-1">
      {track.examNames.map((examName) => {
        const isEnabled = enabledExams.includes(examName);
        const displayName = displayNameForExamCatalog(examName, catalog) || examName;
        const isOnlyEnabled = isEnabled && enabledExams.length === 1;
        return (
          <label
            key={examName}
            className={clsx(
              "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
              disabled || isOnlyEnabled
                ? "cursor-default opacity-60"
                : "hover:bg-kal-accent/5",
            )}
          >
            <input
              type="checkbox"
              checked={isEnabled}
              disabled={disabled || isOnlyEnabled}
              onChange={() => toggle(examName)}
              className="h-4 w-4 rounded border-kal-border accent-kal-accent"
            />
            <span className="text-sm text-kal-text">{displayName}</span>
            {isOnlyEnabled && (
              <span className="ml-auto text-[10px] text-kal-text-secondary">
                required
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}
