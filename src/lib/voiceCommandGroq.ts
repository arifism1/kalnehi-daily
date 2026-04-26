import Groq from "groq-sdk";

import { getGroqModel } from "@/lib/groqClient";

export type VoiceCommandIntent =
  | { intent: "add_task"; subject: string; duration_minutes: number | null }
  | { intent: "mark_completed"; subject: string }
  | { intent: "ask_prepbrain"; query: string }
  | { intent: "schedule_revision"; subject: string; days: number }
  | { intent: "mark_syllabus_progress"; subject: string; percent: number }
  | { intent: "log_sleep"; hours: number }
  | { intent: "navigate"; path: string }
  | { intent: "query_plan" }
  | { intent: "query_progress" }
  | { intent: "unknown"; clarification: string };

export type VoiceCommandResult =
  | { ok: true; intent: VoiceCommandIntent; response_text: string; inputTokens: number; outputTokens: number; model: string }
  | { ok: false; error: string };

const VALID_NAV_PATHS = new Set([
  // Core / home
  "/home",
  "/profile",
  "/settings",
  "/notifications",
  "/my-subscription",
  "/feedback",
  // Planning & execution
  "/daily-plan",
  "/daily-log",
  "/daily-engine",
  "/dictate-day",
  "/saved-plans",
  "/missed-tasks",
  "/calendar",
  "/timer",
  "/study-sessions",
  "/study-camera",
  "/paste-handwritten",
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
  "/revision-reminders",
  "/syllabus",
  "/doubts",
  "/mastermind",
  // Wellbeing
  "/habits",
  "/meditation",
  "/meditation/consistency",
  "/motivation",
]);

const SYSTEM_PROMPT = `You are a voice assistant for Kalnehi Daily, an Indian competitive exam preparation app (JEE, NEET, UPSC, CUET, CAT, etc.).

Parse the user voice command and return ONLY a valid JSON object — no markdown, no extra text.

## JSON structure
{"intent": "<intent_name>", ...intent_fields, "response_text": "<short warm confirmation, 1-2 sentences>"}

## Supported intents

### add_task — add a topic or task to today's study plan
{"intent":"add_task","subject":"<topic name>","duration_minutes":<number or null>,"response_text":"..."}
- "Add rotational dynamics for 90 minutes" → {"intent":"add_task","subject":"Rotational Dynamics","duration_minutes":90,"response_text":"Added Rotational Dynamics to your plan for 90 minutes."}
- "Add optics to today's plan" → {"intent":"add_task","subject":"Optics","duration_minutes":null,"response_text":"Added Optics to today's plan."}

### mark_completed — mark a task or topic as done
{"intent":"mark_completed","subject":"<task title or ordinal like first task>","response_text":"..."}
- "Mark optics as completed" → {"intent":"mark_completed","subject":"Optics","response_text":"Marked Optics as completed. Great work!"}
- "Mark first task done" → {"intent":"mark_completed","subject":"first task","response_text":"Marked the first task as complete."}

### ask_prepbrain — ask the AI study coach a question
{"intent":"ask_prepbrain","query":"<the question>","response_text":"..."}
- "Ask Mastermind which chapters I should focus on" → {"intent":"ask_prepbrain","query":"Which chapters should I focus on?","response_text":"Opening Mastermind with your question."}

### schedule_revision — schedule a revision reminder for a topic
{"intent":"schedule_revision","subject":"<topic name>","days":<number>,"response_text":"..."}
- "Schedule revision for coordination compounds in 7 days" → {"intent":"schedule_revision","subject":"Coordination Compounds","days":7,"response_text":"Let's set a revision reminder for Coordination Compounds in 7 days."}

### mark_syllabus_progress — update syllabus completion percentage
{"intent":"mark_syllabus_progress","subject":"<chapter or topic>","percent":<0-100>,"response_text":"..."}
- "Mark laws of motion as 70% done" → {"intent":"mark_syllabus_progress","subject":"Laws of Motion","percent":70,"response_text":"Opening Syllabus Tracker to update Laws of Motion to 70%."}

### log_sleep — log sleep hours for the day
{"intent":"log_sleep","hours":<number>,"response_text":"..."}
- "Log sleep 7 hours" → {"intent":"log_sleep","hours":7,"response_text":"Got it! Opening your daily plan to log 7 hours of sleep."}

### navigate — go to a screen in the app
{"intent":"navigate","path":"<valid path>","response_text":"..."}
Valid paths:
  Core: /home, /profile, /settings, /notifications, /my-subscription, /feedback
  Planning: /daily-plan, /daily-log, /daily-engine, /dictate-day, /saved-plans, /missed-tasks, /calendar, /timer, /study-sessions, /study-camera, /paste-handwritten
  Planner: /planner, /planner/habits, /planner/schedule, /planner/weekly, /planner/todos, /planner/routine, /planner/productivity
  Track: /progress, /consistency-tracker, /heatmap, /marks-engine, /my-target, /target-score-blueprint
  Revise: /revision-reminders, /syllabus, /doubts, /mastermind
  Wellbeing: /habits, /meditation, /meditation/consistency, /motivation
- "Go to home" → {"intent":"navigate","path":"/home","response_text":"Going home."}
- "Go to daily plan" → {"intent":"navigate","path":"/daily-plan","response_text":"Going to your daily plan."}
- "Show my missed tasks" → {"intent":"navigate","path":"/missed-tasks","response_text":"Opening your missed tasks."}
- "Open calendar" → {"intent":"navigate","path":"/calendar","response_text":"Opening the calendar."}
- "Show my heatmap" → {"intent":"navigate","path":"/heatmap","response_text":"Opening your study heatmap."}
- "Open planner" → {"intent":"navigate","path":"/planner","response_text":"Opening the planner."}
- "Open weekly plan" → {"intent":"navigate","path":"/planner/weekly","response_text":"Opening your weekly plan."}
- "Go to todos" → {"intent":"navigate","path":"/planner/todos","response_text":"Opening your todos."}
- "Open my target" → {"intent":"navigate","path":"/my-target","response_text":"Opening your exam target."}
- "Target score blueprint" → {"intent":"navigate","path":"/target-score-blueprint","response_text":"Opening the target score blueprint."}
- "Open profile" → {"intent":"navigate","path":"/profile","response_text":"Opening your profile."}
- "Open daily engine" → {"intent":"navigate","path":"/daily-engine","response_text":"Opening the daily engine."}
- "Open study camera" → {"intent":"navigate","path":"/study-camera","response_text":"Opening study camera."}

- "Plan my day" → {"intent":"navigate","path":"/daily-plan","response_text":"Opening your daily plan."}
- "Open Mastermind" → {"intent":"navigate","path":"/mastermind","response_text":"Opening Mastermind."}
- "Go to revision reminders" → {"intent":"navigate","path":"/revision-reminders","response_text":"Opening Revision Reminders."}

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
- response_text must be natural and warm, max 2 sentences
- Return ONLY the JSON object, nothing else
- If the current page context is given, use it to better understand commands like "add this topic" or "mark as done"`;

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
      return { intent: "add_task", subject, duration_minutes };
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
      const rawDays = o.days;
      const days =
        typeof rawDays === "number" && Number.isFinite(rawDays)
          ? Math.max(1, Math.round(rawDays))
          : 7;
      return { intent: "schedule_revision", subject, days };
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
      return { intent: "navigate", path: VALID_NAV_PATHS.has(path) ? path : "/home" };
    }
    case "query_plan":
      return { intent: "query_plan" };
    case "query_progress":
      return { intent: "query_progress" };
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

async function callGroq(
  client: Groq,
  model: string,
  userMessage: string,
): Promise<VoiceCommandResult> {
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    temperature: 0.1,
    max_tokens: 200,
  });

  const inputTokens = completion.usage?.prompt_tokens ?? 0;
  const outputTokens = completion.usage?.completion_tokens ?? 0;
  const modelUsed = completion.model ?? model;
  const content = completion.choices[0]?.message?.content ?? "";
  const parsed = extractFirstJsonObject(content);

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

  return { ok: true, intent: intentObj, response_text: responseText, inputTokens, outputTokens, model: modelUsed };
}

export async function runVoiceCommand(
  transcript: string,
  pageContext: string,
): Promise<VoiceCommandResult> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "Voice commands are not configured on this server." };
  }

  const client = new Groq({ apiKey });
  const primary = getGroqModel("parsing");
  const userMessage = [
    pageContext ? `[Current page: ${pageContext}]` : null,
    `Voice command: ${transcript.trim().slice(0, 2000)}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    return await callGroq(client, primary, userMessage);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("model_not_found") || msg.includes("decommissioned")) {
      try {
        return await callGroq(client, "llama-3.3-70b-versatile", userMessage);
      } catch {
        // fall through
      }
    }
    return { ok: false, error: "Voice processing failed. Please try again." };
  }
}
