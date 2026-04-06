/**
 * Offline-first line parser for planner OCR text (times + task names).
 * Used when no LLM key is configured or as a sanity baseline.
 */

export type ParsedPlannerLine = {
  name: string;
  start_time: string | null;
  end_time: string | null;
};

/** Result of server-side Groq Vision parse of a handwritten planner photo. */
export type ParsePlannerImageResult =
  | { ok: true; tasks: ParsedPlannerLine[] }
  | { ok: false; error: string; tasks: ParsedPlannerLine[] };

/** DB time "HH:MM:SS" for Postgres time column */
function toDbTime(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

function parseHourMinute(
  s: string,
): { h: number; m: number; ampm?: "am" | "pm" } | null {
  const t = s.trim();
  const m12 = t.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (m12) {
    let h = Number(m12[1]);
    const min = Number(m12[2]);
    const ap = m12[3]?.toLowerCase() as "am" | "pm" | undefined;
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    if (h < 0 || h > 23 || min < 0 || min > 59) return null;
    return { h, m: min, ampm: ap };
  }
  const m24 = t.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const h = Number(m24[1]);
    const min = Number(m24[2]);
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) return { h, m: min };
  }
  return null;
}

/** Split "9:00 AM - 10:30 Physics" or "09:00-10:00: Read chapter" */
export function parsePlannerTextLocal(raw: string): ParsedPlannerLine[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const out: ParsedPlannerLine[] = [];

  for (const line of lines) {
    const range = line.match(
      /^(\d{1,2}:\d{2}(?:\s*[ap]m)?)\s*[-–—]\s*(\d{1,2}:\d{2}(?:\s*[ap]m)?)\s+(.+)$/i,
    );
    if (range) {
      const a = parseHourMinute(range[1]);
      const b = parseHourMinute(range[2]);
      if (a && b) {
        out.push({
          name: range[3].trim(),
          start_time: toDbTime(a.h, a.m),
          end_time: toDbTime(b.h, b.m),
        });
        continue;
      }
    }

    const single = line.match(
      /^(\d{1,2}:\d{2}(?:\s*[ap]m)?)\s+(.+)$/i,
    );
    if (single) {
      const a = parseHourMinute(single[1]);
      if (a) {
        out.push({
          name: single[2].trim(),
          start_time: toDbTime(a.h, a.m),
          end_time: null,
        });
        continue;
      }
    }

    if (line.length > 2) {
      out.push({
        name: line,
        start_time: null,
        end_time: null,
      });
    }
  }

  return out;
}
