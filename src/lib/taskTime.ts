/** HTML `<input type="time">` uses `HH:MM`; DB often returns `HH:MM:SS`. */
export function dbTimeToInputValue(v: string | null | undefined): string {
  if (v == null || !String(v).trim()) return "";
  const s = String(v).trim();
  return s.length >= 5 ? s.slice(0, 5) : s;
}

/** Store TIME-compatible string for Supabase/Postgres. */
export function inputTimeToDb(v: string): string | null {
  const t = v.trim();
  if (!t) return null;
  return t.length === 5 && t.includes(":") ? `${t}:00` : t;
}

/**
 * Minutes between two same-day `HH:MM` values. If end ≤ start, treat as crossing midnight.
 */
export function minutesBetweenTimeInputs(
  from: string,
  to: string,
): number | null {
  if (!from?.trim() || !to?.trim()) return null;
  const parse = (h: string) => {
    const parts = h.split(":");
    const x = Number(parts[0]);
    const y = Number(parts[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return x * 60 + y;
  };
  const startMin = parse(from);
  let endMin = parse(to);
  if (startMin == null || endMin == null) return null;
  if (endMin <= startMin) endMin += 24 * 60;
  return endMin - startMin;
}

export function formatTaskTimeRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string | null {
  const a = start ? dbTimeToInputValue(start) : "";
  const b = end ? dbTimeToInputValue(end) : "";
  if (a && b) return `${a}–${b}`;
  if (a) return `From ${a}`;
  if (b) return `Until ${b}`;
  return null;
}

/** Format seconds as m:ss or h:mm:ss for active timers. */
export function formatElapsedSeconds(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** 12-hour clock pieces for optional schedule pickers. */
export type TwelveHourSelection = {
  hour12: number;
  minute: number;
  period: "AM" | "PM";
};

export function twelveHourFromDate(d: Date): TwelveHourSelection {
  const h24 = d.getHours();
  const minute = d.getMinutes();
  const period = h24 >= 12 ? "PM" : "AM";
  let hour12 = h24 % 12;
  if (hour12 === 0) hour12 = 12;
  return { hour12, minute, period };
}

/** Postgres-compatible `TIME` string `HH:MM:SS` (24h). */
export function dbTimeFromTwelveHour(sel: TwelveHourSelection): string {
  const h24 =
    sel.period === "AM"
      ? sel.hour12 === 12
        ? 0
        : sel.hour12
      : sel.hour12 === 12
        ? 12
        : sel.hour12 + 12;
  return `${String(h24).padStart(2, "0")}:${String(sel.minute).padStart(2, "0")}:00`;
}
