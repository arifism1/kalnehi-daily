"use server";

import Groq from "groq-sdk";

import { incrementPhotoScanUsage } from "@/actions/subscription";
import { getGroqModelCandidates } from "@/lib/groqClient";
import { ocrHandwrittenPhoto } from "@/lib/mistralOcr";
import { PASTE_HANDWRITTEN_PLAN_PROMPT } from "@/lib/voicePrompts";
import { runVoiceParseDraft } from "@/lib/runVoiceParseDraft";

export type ParsedPastedPlanTask = {
  name: string;
  start_time: string | null;
  end_time: string | null;
  duration: string | null;
};

type ParseResult =
  | { ok: true; tasks: ParsedPastedPlanTask[] }
  | { ok: false; error: string; tasks: ParsedPastedPlanTask[] };

const MAX_TASKS = 60;
const ALLOWED_PHOTO_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_PHOTO_BASE64_CHARS = 3_750_000;

/**
 * One clock fragment for local regex (handwritten schedules): `7:30 pm`, `9 am`, `6am`.
 * Order: H:MM with optional am/pm, then hour + space + am/pm, then glued `6am`.
 */
const FLEX_TIME_TOKEN_SRC =
  "(?:\\d{1,2}:\\d{2}\\s*(?:am|pm)?|\\d{1,2}\\s*(?:am|pm)|\\d{1,2}(?:am|pm))";

const FLEX_SCHEDULE_RANGE_LINE = new RegExp(
  `^(${FLEX_TIME_TOKEN_SRC})\\s*(?:-|–|—|\\bto\\b)\\s*(${FLEX_TIME_TOKEN_SRC})(.*)$`,
  "i",
);

const FLEX_SCHEDULE_SINGLE_LINE = new RegExp(
  `^(${FLEX_TIME_TOKEN_SRC})(.*)$`,
  "i",
);

function normalizeHHMM(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const t = raw.trim().toLowerCase();
  if (!t) return null;

  const ampm = t.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (ampm) {
    let h = Number(ampm[1]);
    const m = Number(ampm[2]);
    const ap = ampm[3].toLowerCase();
    if (m > 59 || h < 1 || h > 12) return null;
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  const hourAmpm = t.match(/^(\d{1,2})\s*(am|pm)$/i);
  if (hourAmpm) {
    let h = Number(hourAmpm[1]);
    const ap = hourAmpm[2].toLowerCase();
    if (h < 1 || h > 12) return null;
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:00`;
  }

  const hm = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!hm) return null;
  const h = Number(hm[1]);
  const m = Number(hm[2]);
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function extractOutermostJson(text: string): string | null {
  const arrStart = text.indexOf("[");
  const objStart = text.indexOf("{");
  if (arrStart === -1 && objStart === -1) return null;
  if (arrStart !== -1 && (objStart === -1 || arrStart < objStart)) {
    const end = text.lastIndexOf("]");
    if (end > arrStart) return text.slice(arrStart, end + 1);
  }
  if (objStart !== -1) {
    const end = text.lastIndexOf("}");
    if (end > objStart) return text.slice(objStart, end + 1);
  }
  return null;
}

function rowActivityText(o: Record<string, unknown>): string {
  const candidates = [
    o.name,
    o.activity,
    o.title,
    o.task,
    o.Task,
    o.description,
  ];
  for (const c of candidates) {
    if (typeof c === "string") {
      const t = c.trim();
      if (t.length > 0) return t;
    }
  }
  return "";
}

function sanitizeTasks(raw: unknown[]): ParsedPastedPlanTask[] {
  const out: ParsedPastedPlanTask[] = [];
  for (const item of raw.slice(0, MAX_TASKS)) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    const name = rowActivityText(o);
    const lower = name.toLowerCase();
    if (
      lower === "task" ||
      lower === "activity" ||
      lower === "time slot" ||
      lower === "duration"
    ) {
      continue;
    }
    if (!name) continue;
    const duration =
      typeof o.duration === "string" && o.duration.trim().length > 0
        ? o.duration.trim().slice(0, 30)
        : null;
    out.push({
      name: name.slice(0, 400),
      start_time: normalizeHHMM(
        typeof o.start_time === "string" ? o.start_time : null,
      ),
      end_time: normalizeHHMM(typeof o.end_time === "string" ? o.end_time : null),
      duration,
    });
  }
  return out;
}

function parseFromGroqContent(content: string): ParsedPastedPlanTask[] | null {
  const cleaned = content
    .replace(/```json\n?/gi, "")
    .replace(/```\n?/g, "")
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const extracted = extractOutermostJson(cleaned);
    if (!extracted) return null;
    try {
      parsed = JSON.parse(extracted);
    } catch {
      return null;
    }
  }

  if (Array.isArray(parsed)) {
    const rows = sanitizeTasks(parsed);
    return rows.length > 0 ? rows : null;
  }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const o = parsed as Record<string, unknown>;
    if (Array.isArray(o.tasks)) {
      const rows = sanitizeTasks(o.tasks);
      return rows.length > 0 ? rows : null;
    }
  }
  return null;
}

export async function parseHandwrittenPlannerPhoto(input: {
  imageBase64: string;
  mimeType: string;
  logDate: string;
}): Promise<ParseResult> {
  const usageCheck = await incrementPhotoScanUsage();
  if (!usageCheck.ok) {
    return { ok: false, error: usageCheck.error, tasks: [] };
  }

  const logDate = input.logDate.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate)) {
    return { ok: false, error: "Invalid date.", tasks: [] };
  }
  const mime = input.mimeType.trim().toLowerCase().split(";")[0].trim();
  if (!ALLOWED_PHOTO_MIME.has(mime)) {
    return {
      ok: false,
      error: "Use a JPEG, PNG, WebP, or GIF photo.",
      tasks: [],
    };
  }
  const b64 = input.imageBase64.trim();
  if (!b64) return { ok: false, error: "No image data.", tasks: [] };
  if (b64.length > MAX_PHOTO_BASE64_CHARS) {
    return {
      ok: false,
      error: "Photo is too large. Try a smaller or cropped image.",
      tasks: [],
    };
  }

  const ocr = await ocrHandwrittenPhoto(b64, mime);
  if (!ocr.ok) {
    return { ok: false, error: ocr.error, tasks: [] };
  }

  const ocrText = ocr.markdown.trim().slice(0, 30_000);

  const tableTasks = parseFromMarkdownTable(ocrText);
  if (tableTasks.length > 0) return { ok: true, tasks: tableTasks };

  const lineTasks = parseFromScheduleLines(ocrText);
  if (lineTasks.length > 0) return { ok: true, tasks: lineTasks };

  try {
    const viaVoiceStyle = await runVoiceParseDraft(
      ocrText,
      logDate,
      new Date().toISOString(),
    );
    if (viaVoiceStyle.ok && viaVoiceStyle.tasks.length > 0) {
      return {
        ok: true,
        tasks: viaVoiceStyle.tasks.map((t) => ({
          name: t.taskTitle,
          start_time: t.start_time,
          end_time: t.end_time,
          duration: t.duration,
        })),
      };
    }
  } catch {
    // fall through to raw-text fallback
  }

  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (apiKey) {
    const groq = new Groq({ apiKey });
    for (const model of getGroqModelCandidates("parsing")) {
      try {
        const completion = await groq.chat.completions.create({
          model,
          temperature: 0.1,
          max_tokens: 2048,
          messages: [
            { role: "system", content: PASTE_HANDWRITTEN_PLAN_PROMPT },
            {
              role: "user",
              content: `Extract rows from this OCR text of a handwritten schedule:\n\n${ocrText}\n\nReturn only the JSON array.`,
            },
          ],
        });
        const content = completion.choices[0]?.message?.content ?? "";
        const parsed = parseFromGroqContent(content);
        if (parsed && parsed.length > 0) return { ok: true, tasks: parsed };
      } catch {
        /* try next parsing candidate */
      }
    }
  }

  if (!ocrText) {
    return { ok: false, error: "No tasks found in the photo.", tasks: [] };
  }
  return {
    ok: true,
    tasks: [
      { name: ocrText.slice(0, 300), start_time: null, end_time: null, duration: null },
    ],
  };
}

/** Best-effort local fallback: parse markdown table rows like | 4:45 am – 5:00 am | Wakeup | 15m | */
function parseFromMarkdownTable(raw: string): ParsedPastedPlanTask[] {
  const lines = raw.split(/\r?\n/).map((l) => l.trim());
  const out: ParsedPastedPlanTask[] = [];
  for (const line of lines) {
    if (!line.startsWith("|")) continue;
    if (/^\|\s*-+\s*\|/.test(line)) continue;
    const cols = line
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);
    if (cols.length < 2) continue;
    const [slot, activity, durationMaybe] = cols;
    if (/time slot|activity|duration/i.test(slot) && /activity/i.test(activity)) {
      continue;
    }
    const m = slot.match(
      new RegExp(
        `^(${FLEX_TIME_TOKEN_SRC})\\s*[–—-]\\s*(${FLEX_TIME_TOKEN_SRC})$`,
        "i",
      ),
    );
    const st = normalizeHHMM(m?.[1] ?? null);
    const et = normalizeHHMM(m?.[2] ?? null);
    const name = (activity ?? "").trim();
    if (!name) continue;
    out.push({
      name: name.slice(0, 400),
      start_time: st,
      end_time: et,
      duration: durationMaybe ? durationMaybe.slice(0, 30) : null,
    });
  }
  return out;
}

function cleanupActivityName(raw: string): string {
  return raw
    .replace(/^[\s\-–—•*]+/, "")
    .replace(/^\d+\.\s*/, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 400);
}

/** Parse plain schedule lines such as "5:00 am - 6:30 am Physics revision". */
function parseFromScheduleLines(raw: string): ParsedPastedPlanTask[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const out: ParsedPastedPlanTask[] = [];
  for (const line of lines) {
    if (
      /^(date|day|schedule|time slot|activity|duration|why this matters|clean & accurate transcription)/i.test(
        line,
      )
    ) {
      continue;
    }

    const range = line.match(FLEX_SCHEDULE_RANGE_LINE);
    if (range) {
      const st = normalizeHHMM(range[1]);
      const et = normalizeHHMM(range[2]);
      const name = cleanupActivityName(range[3] ?? "");
      if (name) {
        out.push({
          name,
          start_time: st,
          end_time: et,
          duration: null,
        });
        continue;
      }
    }

    const single = line.match(FLEX_SCHEDULE_SINGLE_LINE);
    if (single) {
      const st = normalizeHHMM(single[1]);
      const name = cleanupActivityName(single[2] ?? "");
      if (name) {
        out.push({
          name,
          start_time: st,
          end_time: null,
          duration: null,
        });
      }
    }
  }
  return out.slice(0, MAX_TASKS);
}


