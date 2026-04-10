import { minutesBetweenHHMM, normalizeVoiceHHMM } from "@/lib/voiceIst";

/** "HH:MM" from Postgres `time` string like "09:30:00". */
export function timeDbToInput(t: string | null | undefined): string {
  if (!t) return "";
  const s = String(t).trim();
  return s.length >= 5 ? s.slice(0, 5) : s;
}

/** Build display slot and optional TIME values for DB. */
export function slotFromStartEnd(
  startInput: string,
  endInput: string,
): {
  time_slot: string | null;
  time_start: string | null;
  time_end: string | null;
} {
  const start = normalizeVoiceHHMM(startInput.trim() || null);
  const end = normalizeVoiceHHMM(endInput.trim() || null);
  const time_start =
    start && /^\d{2}:\d{2}$/.test(start) ? `${start}:00` : null;
  const time_end = end && /^\d{2}:\d{2}$/.test(end) ? `${end}:00` : null;
  let time_slot: string | null = null;
  if (start && end) time_slot = `${start}–${end}`;
  else if (start) time_slot = start;
  else if (end) time_slot = end;
  return { time_slot, time_start, time_end };
}

export function durationLabelFromDb(
  time_start: string | null,
  time_end: string | null,
): string | null {
  const s = time_start ? timeDbToInput(time_start) : "";
  const e = time_end ? timeDbToInput(time_end) : "";
  if (!s || !e) return null;
  const mins = minutesBetweenHHMM(s, e);
  if (mins == null) return null;
  if (mins >= 60) {
    return mins % 60 === 0
      ? `${Math.floor(mins / 60)}h`
      : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  }
  return `${mins}m`;
}
