import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { examDisplayLabel } from "@/lib/examProfile";

import { generateStudySquadEvent } from "./mockStudySquadFeed";
import { getSquadTemplateFlavor } from "./squadTemplateFlavor";
import type { SquadTemplateFlavor } from "./squadTemplateFlavor";
import type { StudySquadEvent } from "./types";

export const STUDY_SQUAD_MAX_VISIBLE = 5;

function seedEvents(
  subjectPool: readonly string[],
  examDisplay: string,
  examLabel: string | null,
  flavor: SquadTemplateFlavor,
): StudySquadEvent[] {
  const seedCount = 1 + Math.floor(Math.random() * 2);
  return Array.from({ length: seedCount }, () =>
    generateStudySquadEvent({
      subjectPool,
      examDisplay,
      examLabel,
      flavor,
    }),
  );
}

/**
 * Simulated live feed: task lines use only `syllabusLabels` from the server (syllabus_master path).
 * When the pool is empty, peers still appear but status lines stay neutral — no generic exam subjects.
 */
export function useSimulatedStudySquadFeed(
  enabled: boolean,
  examLabel: string | null,
  syllabusLabels: readonly string[],
  syllabusLabelsKey: string,
): StudySquadEvent[] {
  const labelsRef = useRef(syllabusLabels);

  useLayoutEffect(() => {
    labelsRef.current = syllabusLabels;
  }, [syllabusLabels]);

  const examDisplay = useMemo(
    () => examDisplayLabel(examLabel)?.trim() || "their target exam",
    [examLabel],
  );

  const flavor = useMemo(() => getSquadTemplateFlavor(examLabel), [examLabel]);

  const [events, setEvents] = useState<StudySquadEvent[]>([]);

  useEffect(() => {
    if (!enabled) {
      const clearId = window.setTimeout(() => setEvents([]), 0);
      return () => clearTimeout(clearId);
    }

    let cancelled = false;
    let tickId: number | undefined;
    const seedId = window.setTimeout(() => {
      if (cancelled) return;
      const subjectPool = labelsRef.current;
      setEvents(seedEvents(subjectPool, examDisplay, examLabel, flavor));

      const scheduleNext = () => {
        if (cancelled) return;
        const ms = 3000 + Math.random() * 5000;
        tickId = window.setTimeout(() => {
          if (cancelled) return;
          setEvents((prev) => {
            const next = [
              ...prev,
              generateStudySquadEvent({
                subjectPool: labelsRef.current,
                examDisplay,
                examLabel,
                flavor,
              }),
            ];
            return next.length > STUDY_SQUAD_MAX_VISIBLE ? next.slice(-STUDY_SQUAD_MAX_VISIBLE) : next;
          });
          scheduleNext();
        }, ms);
      };
      scheduleNext();
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(seedId);
      if (tickId !== undefined) window.clearTimeout(tickId);
    };
  }, [enabled, syllabusLabelsKey, examDisplay, examLabel, flavor]);

  return events;
}
