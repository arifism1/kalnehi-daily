/** IST helpers for voice timeline scheduling (student context: India). */

/** Clock time HH:MM in Asia/Kolkata from an ISO instant. */
export function isoToIST_HHMM(iso: string): string {
  const d = new Date(iso);
  const t = Number.isNaN(d.getTime()) ? new Date() : d;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(t);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

/** Normalize model output to HH:MM (24h). */
export function normalizeVoiceHHMM(
  raw: string | null | undefined,
): string | null {
  if (raw == null || typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  if (m[3] != null) {
    const s = Number(m[3]);
    if (s > 59) return null;
  }
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** Minutes between two same-day or overnight HH:MM (end after start). */
/** Format plain HH:MM (IST wall clock from the model) as 12h in Asia/Kolkata. */
export function formatIstClock12h(hhmm: string): string {
  const t = hhmm.trim();
  if (!/^\d{2}:\d{2}$/.test(t)) return t || "—";
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const iso = `2000-01-01T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
  const d = new Date(`${iso}+05:30`);
  return d.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** e.g. "1:03 am – 2:03 am" for table preview (inputs stay editable). */
export function formatIstSlotRange12h(start: string, end: string): string {
  const a = start.trim() ? formatIstClock12h(start) : "…";
  const b = end.trim() ? formatIstClock12h(end) : "…";
  return `${a} – ${b}`;
}

export function minutesBetweenHHMM(
  start: string | null,
  end: string | null,
): number | null {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return null;
  const a = sh * 60 + sm;
  let b = eh * 60 + em;
  if (b < a) b += 24 * 60;
  const diff = b - a;
  if (diff <= 0 || diff > 24 * 60) return null;
  return diff;
}

/** e.g. 270 → "4h 30m", 45 → "45m". */
export function formatDurationCompactMinutes(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return "—";
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Human-readable duration between two HH:MM values (preview under time inputs).
 * Incomplete times → "…"; invalid or zero-length slot → "—".
 */
export function formatIstSlotDurationLabel(start: string, end: string): string {
  const s = start.trim();
  const e = end.trim();
  if (!s || !e) return "…";
  const mins = minutesBetweenHHMM(s, e);
  if (mins == null) return "—";
  return formatDurationCompactMinutes(mins);
}
