import Groq from "groq-sdk";

import { getGroqModel } from "@/lib/groqClient";
import { normalizeVoiceHHMM } from "@/lib/voiceIst";

export type VoiceFocusMode = "pomodoro" | "deep" | "sprint" | "custom";

export type VoiceCommandIntent =
  | {
      intent: "add_task";
      subject: string;
      duration_minutes: number | null;
      time_start: string | null;
      time_end: string | null;
    }
  | { intent: "mark_completed"; subject: string }
  | { intent: "ask_prepbrain"; query: string }
  | { intent: "schedule_revision"; subject: string; days: number; exact_date: string | null }
  | { intent: "mark_syllabus_progress"; subject: string; percent: number }
  | { intent: "log_sleep"; hours: number }
  | { intent: "navigate"; path: string }
  | { intent: "query_plan" }
  | { intent: "query_progress" }
  | {
      intent: "focus_mode";
      duration: number;
      mode: VoiceFocusMode;
      linked_task: string | null;
      auto_start: boolean;
    }
  | {
      intent: "plan_management";
      action_type: "add" | "move" | "mark_done";
      task_name: string;
      target_date: string;
      duration_logged: number | null;
      time_start: string | null;
      time_end: string | null;
    }
  | {
      intent: "batch_add_tasks";
      plan_date: string;
      items: Array<{
        title: string;
        time_start: string | null;
        time_end: string | null;
        duration_minutes: number | null;
      }>;
    }
  | {
      intent: "doubt_logging";
      subject: string;
      doubt_text: string;
      open_camera: boolean;
    }
  | {
      intent: "mindset_trigger";
      trigger_type: "focus_breath" | "anxiety_reset" | "purpose_mode";
    }
  | { intent: "unknown"; clarification: string };

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoDateField(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  return ISO_DATE_RE.test(s) ? s : null;
}

function parseOptionalVoiceHHMM(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw !== "string") return null;
  return normalizeVoiceHHMM(raw.trim());
}

export type VoiceCommandResult =
  | { ok: true; intent: VoiceCommandIntent; response_text: string; inputTokens: number; outputTokens: number; model: string }
  | { ok: false; error: string };

const VALID_NAV_PATHS = new Set([
  // Core / home
  "/syllabus",
  "/dashboard",
  "/home",
  "/profile",
  "/settings",
  "/notifications",
  "/my-subscription",
  "/feedback",
  // Planning & execution
  "/daily-plan",
  "/daily-debrief",
  "/daily-log",
  "/recap",
  "/recap/weekly",
  "/recap/monthly",
  "/daily-engine",
  "/dictate-day",
  "/saved-plans",
  "/missed-tasks",
  "/calendar",
  "/timer",
  "/study-sessions",
  "/study-squad",
  "/study-camera",
  // Planner sub-pages
  "/planner",
  "/planner/habits",
  "/planner/schedule",
  "/planner/weekly",
  "/planner/todos",
  "/planner/routine",
  "/planner/productivity",
  // Track & measure
  "/progress",
  "/consistency-tracker",
  "/heatmap",
  "/marks-engine",
  "/my-target",
  "/target-score-blueprint",
  // Learn & revise
  "/revision-tracker",
  "/syllabus",
  "/doubts",
  "/mastermind",
  "/prepbrain",
  "/mock-tests",
  "/mistake-log",
  // Wellbeing
  "/habits",
  "/meditation",
  "/meditation/consistency",
  "/motivation",
]);

/** Prefixes voice must never navigate to (admin, internals, API routes). */
const BLOCKED_VOICE_NAV_PREFIXES: readonly string[] = [
  "/admin",
  "/api",
  "/_next",
  "/_vercel",
];

function voiceNavigatePathname(path: string): string {
  return path.trim().split(/[?#]/)[0] ?? "";
}

/** Legacy URLs still emitted by models or bookmarks → canonical app path. */
const VOICE_NAV_PATH_ALIASES: Readonly<Record<string, string>> = {
  "/revision-reminders": "/revision-tracker",
  "/home": "/syllabus",
};

export function canonicalVoiceNavigatePath(path: string): string {
  const raw = typeof path === "string" ? path.trim() : "";
  return VOICE_NAV_PATH_ALIASES[raw] ?? raw;
}

function isBlockedVoiceNavigatePrefix(pathname: string): boolean {
  const p = pathname.toLowerCase();
  if (!p.startsWith("/")) return true;
  if (p.startsWith("//")) return true;
  if (p.includes("..")) return true;
  return BLOCKED_VOICE_NAV_PREFIXES.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`),
  );
}

/**
 * True only for exact allowlisted app paths that are not admin/internal surfaces.
 * Use before `router.push` from voice.
 */
export function isVoiceNavigatePathAllowed(path: string): boolean {
  const raw = typeof path === "string" ? path.trim() : "";
  if (!raw.startsWith("/")) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/i.test(raw)) return false;
  if (raw.includes("://")) return false;
  const canonical = canonicalVoiceNavigatePath(raw);
  const pathname = voiceNavigatePathname(canonical);
  if (!pathname) return false;
  if (isBlockedVoiceNavigatePrefix(pathname)) return false;
  return VALID_NAV_PATHS.has(canonical);
}

const SYSTEM_PROMPT = `You are a voice assistant for Kalnehi Daily, an Indian competitive exam preparation app (JEE, NEET, UPSC, CUET, CAT, etc.).

Parse the user voice command and return ONLY a valid JSON object — no markdown, no extra text.

## JSON structure
{"intent": "<intent_name>", ...intent_fields, "response_text": "<short warm confirmation, 1-2 sentences>"}

## Supported intents

### add_task — add a topic or task to today's study plan
{"intent":"add_task","subject":"<topic name>","duration_minutes":<number or null>,"time_start":"<HH:MM 24h or null>","time_end":"<HH:MM 24h or null>","response_text":"..."}
- Optional time_start / time_end: 24-hour strings (5 PM → "17:00"). If only one clock time is given, put it in time_start and leave time_end null unless they give an end time.
- "Add rotational dynamics for 90 minutes" → {"intent":"add_task","subject":"Rotational Dynamics","duration_minutes":90,"time_start":null,"time_end":null,"response_text":"Added Rotational Dynamics to your plan for 90 minutes."}
- "Add optics to today's plan" → {"intent":"add_task","subject":"Optics","duration_minutes":null,"time_start":null,"time_end":null,"response_text":"Added Optics to today's plan."}
- "Add chemistry at 5 PM today" → {"intent":"add_task","subject":"Chemistry","duration_minutes":null,"time_start":"17:00","time_end":null,"response_text":"Added Chemistry at 5 PM to today's plan."}

### mark_completed — mark a task or topic as done
{"intent":"mark_completed","subject":"<task title or ordinal like first task>","response_text":"..."}
- "Mark optics as completed" → {"intent":"mark_completed","subject":"Optics","response_text":"Marked Optics as completed. Great work!"}
- "Mark first task done" → {"intent":"mark_completed","subject":"first task","response_text":"Marked the first task as complete."}

### ask_prepbrain — ask the AI study coach a question
{"intent":"ask_prepbrain","query":"<the question>","response_text":"..."}
- "Ask Mastermind which chapters I should focus on" → {"intent":"ask_prepbrain","query":"Which chapters should I focus on?","response_text":"Opening Mastermind with your question."}

### schedule_revision — schedule a revision in Revision Tracker for a topic
{"intent":"schedule_revision","subject":"<topic name>","days":<number>,"exact_date":"<YYYY-MM-DD or null>","response_text":"..."}
- exact_date: set to ISO YYYY-MM-DD when the user names a calendar date ("30 May 2026", "2026-05-30"). Use [Today (IST calendar date)] from the message for "tomorrow" / relative calendar math. Set exact_date to null when they only say "in N days".
- When exact_date is non-null, days may be 1 as a placeholder (clients ignore days in that case).
- "Schedule revision for coordination compounds in 7 days" → {"intent":"schedule_revision","subject":"Coordination Compounds","days":7,"exact_date":null,"response_text":"Let's add Coordination Compounds to Revision Tracker for 7 days from now."}
- "Schedule revision for SHM on 30 May 2026" → {"intent":"schedule_revision","subject":"SHM","days":1,"exact_date":"2026-05-30","response_text":"Opening Revision Tracker for SHM on 30 May 2026."}

### mark_syllabus_progress — update syllabus completion percentage
{"intent":"mark_syllabus_progress","subject":"<chapter or topic>","percent":<0-100>,"response_text":"..."}
- "Mark laws of motion as 70% done" → {"intent":"mark_syllabus_progress","subject":"Laws of Motion","percent":70,"response_text":"Opening Syllabus Tracker to update Laws of Motion to 70%."}

### log_sleep — log sleep hours for the day
{"intent":"log_sleep","hours":<number>,"response_text":"..."}
- "Log sleep 7 hours" → {"intent":"log_sleep","hours":7,"response_text":"Got it! Opening your daily plan to log 7 hours of sleep."}

### focus_mode — start a timed focus block (pomodoro / deep work / sprint)
{"intent":"focus_mode","duration":<minutes 1-180>,"mode":"pomodoro"|"deep"|"sprint"|"custom","linked_task":"<optional topic name or null>","auto_start":<boolean>,"response_text":"..."}
- Map mode: pomodoro≈25min default if user says pomodoro; deep work→deep; sprint→sprint; otherwise custom with their stated minutes.
- "Start a 50 minute physics pomodoro" → {"intent":"focus_mode","duration":50,"mode":"pomodoro","linked_task":"Physics","auto_start":true,"response_text":"Starting a 50-minute Physics pomodoro on the timer."}
- "Deep work 90 minutes on rotational dynamics" → {"intent":"focus_mode","duration":90,"mode":"deep","linked_task":"Rotational Dynamics","auto_start":true,"response_text":"Setting up 90 minutes of deep work for Rotational Dynamics."}

### plan_management — change today's plan: add, move to another day, mark done, or log duration
{"intent":"plan_management","action_type":"add"|"move"|"mark_done","task_name":"<task title>","target_date":"YYYY-MM-DD","duration_logged":<minutes or null>,"time_start":"<HH:MM or null>","time_end":"<HH:MM or null>","response_text":"..."}
- For action_type add only: include time_start / time_end (24h HH:MM) when the user gives a clock time; otherwise null.
- Infer target_date from user (today / tomorrow / explicit date). Use local calendar date in IST sense from wording; if unclear use today for add/mark_done.
- "Move optics to tomorrow" → {"intent":"plan_management","action_type":"move","task_name":"Optics","target_date":"<tomorrow as YYYY-MM-DD>","duration_logged":null,"time_start":null,"time_end":null,"response_text":"Moving Optics to tomorrow."}
- "Add chemistry revision 45 minutes for today" → {"intent":"plan_management","action_type":"add","task_name":"Chemistry revision","target_date":"<today YYYY-MM-DD>","duration_logged":45,"time_start":null,"time_end":null,"response_text":"Adding Chemistry revision to your plan."}
- "Add physics from 5pm to 7pm today" → {"intent":"plan_management","action_type":"add","task_name":"Physics","target_date":"<today>","duration_logged":null,"time_start":"17:00","time_end":"19:00","response_text":"Adding Physics with a time block today."}
- "Mark first task done" → use intent mark_completed when only completion; use plan_management mark_done only when they name a specific task.

### batch_add_tasks — several tasks for the same plan day (prefer when user lists 2+ tasks for one day)
{"intent":"batch_add_tasks","plan_date":"YYYY-MM-DD","items":[{"title":"<name>","time_start":null,"time_end":null,"duration_minutes":null},...],"response_text":"..."}
- Use when the user clearly lists multiple tasks for the same day (often today). Max 8 items — merge or drop extras if they list more.
- Each item: title required; optional time_start/time_end (24h HH:MM); optional duration_minutes (planned minutes).
- Default plan_date to [Today (IST calendar date)] when they say "today".
- Prefer this intent over stuffing many tasks into prose or unknown.

### doubt_logging — quick doubt note (optionally open camera)
{"intent":"doubt_logging","subject":"<subject>","doubt_text":"<what they are stuck on>","open_camera":<boolean>,"response_text":"..."}
- "Log a doubt in chemistry about hybridisation" → {"intent":"doubt_logging","subject":"Chemistry","doubt_text":"Hybridisation","open_camera":false,"response_text":"Saving that doubt to your Doubt Tracker."}
- "Take a photo of this doubt" / "camera" → open_camera:true

### mindset_trigger — brain yoga / calm / motivation
{"intent":"mindset_trigger","trigger_type":"focus_breath"|"anxiety_reset"|"purpose_mode","response_text":"..."}
- Breathing / focus session → focus_breath; anxious/stressed → anxiety_reset; why am I doing this / purpose → purpose_mode

### navigate — go to a screen in the app
{"intent":"navigate","path":"<valid path>","response_text":"..."}
- **Never** emit /admin, /api, /_next, /_vercel, or any path not listed below. Those are forbidden — use the unknown intent or the closest allowed screen instead.

**CRITICAL — Recap vs Daily Debrief (different screens):**
- **Today's Recap** (shareable end-of-day recap card, "my recap", "daily recap", "go to recap") → /recap — NEVER /daily-debrief
- **Weekly recap** / "week recap" → /recap/weekly
- **Monthly recap** / "month recap" → /recap/monthly
- **Daily Debrief** (reflection / journal / notebook debrief flow only) → /daily-debrief — only when the user clearly says debrief, reflection journal, or "daily debrief", NOT when they only say "recap"

Valid paths:
  Core: /syllabus (home), /dashboard (daily hub), /home (alias → syllabus), /profile (exam details and account), /settings (app preferences and notifications), /notifications, /my-subscription, /feedback
  Planning: /daily-plan, /daily-debrief (/daily-log redirects to debrief), /recap (Today's Recap), /recap/weekly, /recap/monthly, /daily-engine, /dictate-day, /saved-plans, /missed-tasks, /calendar, /timer, /study-squad, /study-sessions, /study-camera
  Planner: /planner, /planner/habits, /planner/schedule, /planner/weekly, /planner/todos, /planner/routine, /planner/productivity
  Track: /progress, /consistency-tracker, /heatmap, /marks-engine, /my-target, /target-score-blueprint, /mock-tests, /mistake-log
  Revise: /revision-tracker, /syllabus, /doubts, /mastermind, /prepbrain (same AI coach as Mastermind — prefer /mastermind)
  Wellbeing: /habits, /meditation, /meditation/consistency, /motivation
- "Go to home" → {"intent":"navigate","path":"/syllabus","response_text":"Going home."}
- "Go to dashboard" / "Daily hub" → {"intent":"navigate","path":"/dashboard","response_text":"Opening your dashboard."}
- "Go to daily plan" → {"intent":"navigate","path":"/daily-plan","response_text":"Going to your daily plan."}
- "Go to today's recap" / "Open my recap" → {"intent":"navigate","path":"/recap","response_text":"Opening Today's Recap."}
- "Weekly recap" → {"intent":"navigate","path":"/recap/weekly","response_text":"Opening your weekly recap."}
- "Monthly recap" → {"intent":"navigate","path":"/recap/monthly","response_text":"Opening your monthly recap."}
- "Go to daily debrief" / "Open debrief" → {"intent":"navigate","path":"/daily-debrief","response_text":"Opening Daily Debrief."}
- "Show my missed tasks" → {"intent":"navigate","path":"/missed-tasks","response_text":"Opening your missed tasks."}
- "Open calendar" → {"intent":"navigate","path":"/calendar","response_text":"Opening the calendar."}
- "Show my heatmap" → {"intent":"navigate","path":"/heatmap","response_text":"Opening your study heatmap."}
- "Open planner" → {"intent":"navigate","path":"/planner","response_text":"Opening the planner."}
- "Open weekly plan" → {"intent":"navigate","path":"/planner/weekly","response_text":"Opening your weekly plan."}
- "Go to todos" → {"intent":"navigate","path":"/planner/todos","response_text":"Opening your todos."}
- "Open mock tests" / "Mock test tracker" → {"intent":"navigate","path":"/mock-tests","response_text":"Opening mock tests."}
- "Mistake log" → {"intent":"navigate","path":"/mistake-log","response_text":"Opening your mistake log."}
- "Open my target" → {"intent":"navigate","path":"/my-target","response_text":"Opening your exam target."}
- "Target score blueprint" → {"intent":"navigate","path":"/target-score-blueprint","response_text":"Opening the target score blueprint."}
- "Open profile" → {"intent":"navigate","path":"/profile","response_text":"Opening Profile."}
- "Open settings" or "Open preferences" → {"intent":"navigate","path":"/settings","response_text":"Opening Settings."}
- "Open daily engine" → {"intent":"navigate","path":"/daily-engine","response_text":"Opening the daily engine."}
${process.env.NEXT_PUBLIC_ENABLE_AI_STUDY_PARTNER === "true" ? `- "Open study camera" → {"intent":"navigate","path":"/study-camera","response_text":"Opening study camera."}

` : ""}- "Plan my day" → {"intent":"navigate","path":"/daily-plan","response_text":"Opening your daily plan."}
- "Open Mastermind" / "Open PrepBrain" → {"intent":"navigate","path":"/mastermind","response_text":"Opening Mastermind."}
- "Go to revision tracker" / "Open revision reminders" → {"intent":"navigate","path":"/revision-tracker","response_text":"Opening Revision Tracker."}

### query_plan — ask about today's plan
{"intent":"query_plan","response_text":"..."}
- "What is on my plan today?" → {"intent":"query_plan","response_text":"Opening your daily plan to check what's on today."}

### query_progress — ask about overall preparation progress
{"intent":"query_progress","response_text":"..."}
- "How is my prep going?" → {"intent":"query_progress","response_text":"Opening your progress dashboard."}

### unknown — command not understood
{"intent":"unknown","clarification":"<what was unclear>","response_text":"<gentle explanation, ask to try again>"}

## Rules
- Hindi subject names are valid: Bhautiki=Physics, Rasayan=Chemistry, Ganit=Mathematics, Jeev Vigyan=Biology, Itihas=History, Rajniti=Polity, Bhugol=Geography, Arthshastra=Economics
- Navigation: never output admin, API, or framework paths (/admin, /api, /_next, /_vercel). Only use paths from the valid list above.
- Navigation: "recap" (without "debrief") → /recap family; "debrief" / reflection journal → /daily-debrief — do not confuse these routes.
- If the user lists several tasks for the same day, prefer batch_add_tasks (instead of explanation or unknown).
- response_text must be natural and warm, max 2 sentences
- Return ONLY the JSON object, nothing else
- If the current page context is given, use it to better understand commands like "add this topic" or "mark as done"
- When (Today IST calendar date: YYYY-MM-DD) appears in the user message, use it for plan_management target_date (today/tomorrow = that date ± 1 day)`;

function extractFirstJsonObject(text: string): unknown | null {
  const cleaned = text.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
  const start = cleaned.indexOf("{");
  if (start === -1) return null;
  const end = cleaned.lastIndexOf("}");
  if (end <= start) return null;
  const slice = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    try {
      return JSON.parse(slice.replace(/,\s*([}\]])/g, "$1"));
    } catch {
      return null;
    }
  }
}

function parseIntent(o: Record<string, unknown>): VoiceCommandIntent | null {
  const intent = typeof o.intent === "string" ? o.intent.trim() : null;
  if (!intent) return null;

  switch (intent) {
    case "add_task": {
      const subject = typeof o.subject === "string" ? o.subject.trim() : "";
      if (!subject) return null;
      const dm = o.duration_minutes;
      const duration_minutes =
        typeof dm === "number" && Number.isFinite(dm) && dm > 0
          ? Math.round(dm)
          : null;
      const time_start = parseOptionalVoiceHHMM(o.time_start);
      const time_end = parseOptionalVoiceHHMM(o.time_end);
      return { intent: "add_task", subject, duration_minutes, time_start, time_end };
    }
    case "mark_completed": {
      const subject = typeof o.subject === "string" ? o.subject.trim() : "";
      if (!subject) return null;
      return { intent: "mark_completed", subject };
    }
    case "ask_prepbrain": {
      const query = typeof o.query === "string" ? o.query.trim() : "";
      return { intent: "ask_prepbrain", query: query || "Help me with my preparation" };
    }
    case "schedule_revision": {
      const subject = typeof o.subject === "string" ? o.subject.trim() : "";
      if (!subject) return null;
      const exact_date = parseIsoDateField(o.exact_date);
      const rawDays = o.days;
      const days =
        typeof rawDays === "number" && Number.isFinite(rawDays)
          ? Math.max(1, Math.round(rawDays))
          : 7;
      return { intent: "schedule_revision", subject, days, exact_date };
    }
    case "mark_syllabus_progress": {
      const subject = typeof o.subject === "string" ? o.subject.trim() : "";
      if (!subject) return null;
      const rawPct = o.percent;
      const percent =
        typeof rawPct === "number" && Number.isFinite(rawPct)
          ? Math.min(100, Math.max(0, Math.round(rawPct)))
          : 50;
      return { intent: "mark_syllabus_progress", subject, percent };
    }
    case "log_sleep": {
      const rawH = o.hours;
      const hours =
        typeof rawH === "number" && Number.isFinite(rawH)
          ? Math.min(24, Math.max(0, rawH))
          : 7;
      return { intent: "log_sleep", hours };
    }
    case "navigate": {
      const path = typeof o.path === "string" ? o.path.trim() : "";
      return {
        intent: "navigate",
        path: isVoiceNavigatePathAllowed(path) ? canonicalVoiceNavigatePath(path) : "/syllabus",
      };
    }
    case "query_plan":
      return { intent: "query_plan" };
    case "query_progress":
      return { intent: "query_progress" };
    case "focus_mode": {
      const rawD = o.duration;
      const duration =
        typeof rawD === "number" && Number.isFinite(rawD)
          ? Math.min(180, Math.max(1, Math.round(rawD)))
          : 25;
      const modeRaw =
        typeof o.mode === "string" ? o.mode.trim().toLowerCase() : "custom";
      const mode: VoiceFocusMode =
        modeRaw === "pomodoro" || modeRaw === "deep" || modeRaw === "sprint"
          ? modeRaw
          : "custom";
      const lt = o.linked_task;
      const linked_task =
        typeof lt === "string" && lt.trim() ? lt.trim() : null;
      const auto_start = o.auto_start === true;
      return { intent: "focus_mode", duration, mode, linked_task, auto_start };
    }
    case "plan_management": {
      const at = typeof o.action_type === "string" ? o.action_type.trim().toLowerCase() : "";
      if (at !== "add" && at !== "move" && at !== "mark_done") return null;
      const task_name =
        typeof o.task_name === "string" ? o.task_name.trim() : "";
      if (!task_name) return null;
      const target_date = parseIsoDateField(o.target_date);
      if (!target_date) return null;
      const dl = o.duration_logged;
      const duration_logged =
        typeof dl === "number" && Number.isFinite(dl) && dl > 0
          ? Math.round(dl)
          : null;
      const time_start = parseOptionalVoiceHHMM(o.time_start);
      const time_end = parseOptionalVoiceHHMM(o.time_end);
      return {
        intent: "plan_management",
        action_type: at as "add" | "move" | "mark_done",
        task_name,
        target_date,
        duration_logged,
        time_start,
        time_end,
      };
    }
    case "batch_add_tasks": {
      const plan_date = parseIsoDateField(o.plan_date);
      if (!plan_date) return null;
      const rawItems = o.items;
      if (!Array.isArray(rawItems) || rawItems.length === 0) return null;
      const items: Array<{
        title: string;
        time_start: string | null;
        time_end: string | null;
        duration_minutes: number | null;
      }> = [];
      for (const it of rawItems.slice(0, 8)) {
        if (!it || typeof it !== "object" || Array.isArray(it)) continue;
        const r = it as Record<string, unknown>;
        const title = typeof r.title === "string" ? r.title.trim() : "";
        if (!title) continue;
        const time_start = parseOptionalVoiceHHMM(r.time_start);
        const time_end = parseOptionalVoiceHHMM(r.time_end);
        const dur = r.duration_minutes;
        const duration_minutes =
          typeof dur === "number" && Number.isFinite(dur) && dur > 0
            ? Math.round(dur)
            : null;
        items.push({ title, time_start, time_end, duration_minutes });
      }
      if (items.length === 0) return null;
      return { intent: "batch_add_tasks", plan_date, items };
    }
    case "doubt_logging": {
      const subject = typeof o.subject === "string" ? o.subject.trim() : "";
      const doubt_text =
        typeof o.doubt_text === "string" ? o.doubt_text.trim() : "";
      if (!subject || !doubt_text) return null;
      const open_camera = o.open_camera === true;
      return { intent: "doubt_logging", subject, doubt_text, open_camera };
    }
    case "mindset_trigger": {
      const tt = typeof o.trigger_type === "string" ? o.trigger_type.trim().toLowerCase() : "";
      if (tt !== "focus_breath" && tt !== "anxiety_reset" && tt !== "purpose_mode")
        return null;
      return {
        intent: "mindset_trigger",
        trigger_type: tt as "focus_breath" | "anxiety_reset" | "purpose_mode",
      };
    }
    case "unknown": {
      const clarification =
        typeof o.clarification === "string"
          ? o.clarification.trim()
          : "Command not understood.";
      return { intent: "unknown", clarification };
    }
    default:
      return null;
  }
}

/**
 * Model sometimes routes "recap" phrasing to /daily-debrief. Correct using the raw transcript.
 * Also fixes /daily-log → recap when the user clearly asked for recap only.
 */
export function adjustNavigateIntentForTranscript(
  intent: VoiceCommandIntent,
  transcriptRaw: string,
): VoiceCommandIntent {
  if (intent.intent !== "navigate") return intent;
  const t = transcriptRaw.toLowerCase();
  const saysRecap =
    /\brecap\b|shareable recap|today'?s recap|end-of-day recap|end of day recap|my recap|open recap|\bdaily recap\b/i.test(
      t,
    );
  const saysDebrief =
    /\bdebrief\b|daily debrief|reflection journal|\bopen debrief\b/i.test(t);

  let path = intent.path;

  if (
    (path === "/daily-debrief" || path === "/daily-log") &&
    saysRecap &&
    !saysDebrief
  ) {
    if (/\bweekly\b/.test(t) && /\brecap\b/.test(t)) path = "/recap/weekly";
    else if (/\bmonthly\b/.test(t) && /\brecap\b/.test(t)) path = "/recap/monthly";
    else path = "/recap";
  } else if (
    (path === "/recap" || path === "/recap/weekly" || path === "/recap/monthly") &&
    saysDebrief &&
    !saysRecap
  ) {
    path = "/daily-debrief";
  }

  if (path !== intent.path && isVoiceNavigatePathAllowed(path)) {
    return { intent: "navigate", path };
  }
  return intent;
}

function applyNavigateTranscriptFixes(
  result: VoiceCommandResult,
  transcript: string,
): VoiceCommandResult {
  if (!result.ok) return result;
  return {
    ...result,
    intent: adjustNavigateIntentForTranscript(result.intent, transcript),
  };
}

const VOICE_MAX_COMPLETION_TOKENS = 256;

async function callGroq(
  client: Groq,
  model: string,
  userMessage: string,
): Promise<VoiceCommandResult> {
  let messages: Array<
    { role: "system"; content: string } | { role: "user" | "assistant"; content: string }
  > = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];

  let completion = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.1,
    max_tokens: VOICE_MAX_COMPLETION_TOKENS,
  });

  let inputTokens = completion.usage?.prompt_tokens ?? 0;
  let outputTokens = completion.usage?.completion_tokens ?? 0;
  let modelUsed = completion.model ?? model;
  let content = completion.choices[0]?.message?.content ?? "";
  let parsed = extractFirstJsonObject(content);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
      { role: "assistant", content: content.slice(0, 1200) },
      {
        role: "user",
        content:
          "That was not valid JSON. Reply with ONLY one JSON object for the same voice command (same intent rules). No markdown fences, no text outside the JSON.",
      },
    ];
    completion = await client.chat.completions.create({
      model,
      messages,
      temperature: 0.05,
      max_tokens: VOICE_MAX_COMPLETION_TOKENS,
    });
    inputTokens += completion.usage?.prompt_tokens ?? 0;
    outputTokens += completion.usage?.completion_tokens ?? 0;
    modelUsed = completion.model ?? modelUsed;
    content = completion.choices[0]?.message?.content ?? "";
    parsed = extractFirstJsonObject(content);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      ok: true,
      intent: { intent: "unknown", clarification: "Could not parse response." },
      response_text:
        "Sorry, I didn't quite catch that. Could you try saying it a different way?",
      inputTokens,
      outputTokens,
      model: modelUsed,
    };
  }

  const o = parsed as Record<string, unknown>;
  const intentObj = parseIntent(o);
  const responseText =
    typeof o.response_text === "string" && o.response_text.trim()
      ? o.response_text.trim()
      : "Done!";

  if (!intentObj) {
    return {
      ok: true,
      intent: { intent: "unknown", clarification: "Unrecognized intent." },
      response_text:
        "I wasn't sure what you meant. Try saying something like 'Add maths to today's plan' or 'Go to Mastermind'.",
      inputTokens,
      outputTokens,
      model: modelUsed,
    };
  }

  return {
    ok: true,
    intent: intentObj,
    response_text: responseText,
    inputTokens,
    outputTokens,
    model: modelUsed,
  };
}

export async function runVoiceCommand(
  transcript: string,
  pageContext: string,
  calendarDateIst?: string,
): Promise<VoiceCommandResult> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "Voice commands are not configured on this server." };
  }

  const client = new Groq({ apiKey });
  const primary = getGroqModel("parsing");
  const userMessage = [
    calendarDateIst ? `[Today (IST calendar date): ${calendarDateIst}]` : null,
    pageContext ? `[Current page: ${pageContext}]` : null,
    `Voice command: ${transcript.trim().slice(0, 2000)}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    return applyNavigateTranscriptFixes(
      await callGroq(client, primary, userMessage),
      transcript,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("model_not_found") || msg.includes("decommissioned")) {
      try {
        return applyNavigateTranscriptFixes(
          await callGroq(client, "llama-3.3-70b-versatile", userMessage),
          transcript,
        );
      } catch {
        // fall through
      }
    }
    return { ok: false, error: "Voice processing failed. Please try again." };
  }
}
