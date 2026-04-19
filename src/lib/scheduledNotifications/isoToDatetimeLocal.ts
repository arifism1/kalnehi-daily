import { format, parseISO } from "date-fns";

/** `datetime-local` value (yyyy-MM-ddTHH:mm) in the user's local timezone for a UTC ISO string. */
export function scheduledNotifyIsoToDatetimeLocalValue(iso: string): string {
  try {
    const d = parseISO(iso);
    if (Number.isNaN(d.getTime())) return "";
    return format(d, "yyyy-MM-dd'T'HH:mm");
  } catch {
    return "";
  }
}

/** Split instant into date and time inputs used by the notification hub "When" block. */
export function scheduledNotifyIsoToDateAndTimeDrafts(iso: string): {
  notifyLocal: string;
  whenDateDraft: string;
  whenTimeDraft: string;
} {
  const notifyLocal = scheduledNotifyIsoToDatetimeLocalValue(iso);
  if (!notifyLocal) {
    return { notifyLocal: "", whenDateDraft: "", whenTimeDraft: "" };
  }
  const [whenDateDraft, rest] = notifyLocal.split("T");
  const whenTimeDraft = (rest ?? "").slice(0, 5);
  return { notifyLocal, whenDateDraft: whenDateDraft ?? "", whenTimeDraft };
}
