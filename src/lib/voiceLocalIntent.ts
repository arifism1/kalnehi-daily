import {
  adjustNavigateIntentForTranscript,
  canonicalVoiceNavigatePath,
  isVoiceNavigatePathAllowed,
  type VoiceCommandIntent,
  type VoiceFocusMode,
} from "@/lib/voiceCommandGroq";

export type LocalVoiceIntentConfidence = "high" | "low";

export type LocalVoiceIntentResult = {
  intent: VoiceCommandIntent;
  responseText: string;
  confidence: LocalVoiceIntentConfidence;
};

/** Strip common command prefixes so phrase matching hits the destination name. */
function normalizeTranscript(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[.,!?]+/g, " ")
    .replace(
      /^(hey\s+boss[, ]*|please\s+|can\s+you\s+|could\s+you\s+|i\s+want\s+to\s+|i\s+need\s+to\s+)/,
      "",
    )
    .replace(
      /^(go\s+to|open|show|navigate\s+to|take\s+me\s+to|switch\s+to|visit|launch)\s+(the\s+|my\s+)?/,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

type NavRule = {
  test: RegExp;
  path: string;
  responseText: string;
};

/** Longest / most specific nav rules first. */
const NAV_RULES: NavRule[] = [
  {
    test: /\b(weekly\s+recap|week(?:ly)?\s+recap)\b/,
    path: "/recap/weekly",
    responseText: "Opening your weekly recap.",
  },
  {
    test: /\b(monthly\s+recap|month(?:ly)?\s+recap)\b/,
    path: "/recap/monthly",
    responseText: "Opening your monthly recap.",
  },
  {
    test: /\b(daily\s+debrief|open\s+debrief|debrief|reflection\s+journal)\b/,
    path: "/daily-debrief",
    responseText: "Opening Daily Debrief.",
  },
  {
    test:
      /\b(today'?s\s+recap|daily\s+recap|my\s+recap|end[\s-]of[\s-]day\s+recap|shareable\s+recap|\brecap\b)/,
    path: "/recap",
    responseText: "Opening Today's Recap.",
  },
  {
    test: /\b(daily\s+plan|today'?s\s+plan|plan\s+my\s+day)\b/,
    path: "/daily-plan",
    responseText: "Going to your daily plan.",
  },
  {
    test: /\b(missed\s+tasks?)\b/,
    path: "/missed-tasks",
    responseText: "Opening your missed tasks.",
  },
  {
    test: /\b(target\s+score\s+blueprint)\b/,
    path: "/target-score-blueprint",
    responseText: "Opening the target score blueprint.",
  },
  {
    test: /\b(revision\s+tracker|revision\s+reminders?)\b/,
    path: "/revision-tracker",
    responseText: "Opening Revision Tracker.",
  },
  {
    test: /\b(consistency\s+tracker)\b/,
    path: "/consistency-tracker",
    responseText: "Opening your consistency tracker.",
  },
  {
    test: /\b(study\s+sessions?)\b/,
    path: "/study-sessions",
    responseText: "Opening study sessions.",
  },
  {
    test: /\b(study\s+squad)\b/,
    path: "/study-squad",
    responseText: "Opening study squad.",
  },
  {
    test: /\b(study\s+camera)\b/,
    path: "/study-camera",
    responseText: "Opening study camera.",
  },
  {
    test: /\b(mock\s+tests?|mock\s+test\s+tracker)\b/,
    path: "/mock-tests",
    responseText: "Opening mock tests.",
  },
  {
    test: /\b(mistake\s+log)\b/,
    path: "/mistake-log",
    responseText: "Opening your mistake log.",
  },
  {
    test: /\b(marks\s+engine)\b/,
    path: "/marks-engine",
    responseText: "Opening the marks engine.",
  },
  {
    test: /\b(my\s+target|exam\s+target)\b/,
    path: "/my-target",
    responseText: "Opening your exam target.",
  },
  {
    test: /\b(saved\s+plans?)\b/,
    path: "/saved-plans",
    responseText: "Opening saved plans.",
  },
  {
    test: /\b(daily\s+engine)\b/,
    path: "/daily-engine",
    responseText: "Opening the daily engine.",
  },
  {
    test: /\b(dictate\s+day|dictate\s+my\s+day)\b/,
    path: "/dictate-day",
    responseText: "Opening dictate day.",
  },
  {
    test: /\b(daily\s+log)\b/,
    path: "/daily-log",
    responseText: "Opening daily log.",
  },
  {
    test: /\b(planner\/weekly|weekly\s+plan)\b/,
    path: "/planner/weekly",
    responseText: "Opening your weekly plan.",
  },
  {
    test: /\b(planner\/habits|habit\s+planner)\b/,
    path: "/planner/habits",
    responseText: "Opening habit planner.",
  },
  {
    test: /\b(planner\/schedule)\b/,
    path: "/planner/schedule",
    responseText: "Opening planner schedule.",
  },
  {
    test: /\b(planner\/todos|todos?)\b/,
    path: "/planner/todos",
    responseText: "Opening your todos.",
  },
  {
    test: /\b(planner\/routine)\b/,
    path: "/planner/routine",
    responseText: "Opening your routine planner.",
  },
  {
    test: /\b(planner\/productivity)\b/,
    path: "/planner/productivity",
    responseText: "Opening productivity planner.",
  },
  {
    test: /\b(planner)\b/,
    path: "/planner",
    responseText: "Opening the planner.",
  },
  {
    test: /\b(meditation\/consistency)\b/,
    path: "/meditation/consistency",
    responseText: "Opening meditation consistency.",
  },
  {
    test: /\b(mastermind|prep\s*brain|prepbrain)\b/,
    path: "/mastermind",
    responseText: "Opening Mastermind.",
  },
  {
    test: /\b(my\s+subscription|subscription)\b/,
    path: "/my-subscription",
    responseText: "Opening your subscription.",
  },
  {
    test: /\b(notifications?)\b/,
    path: "/notifications",
    responseText: "Opening notifications.",
  },
  {
    test: /\b(feedback)\b/,
    path: "/feedback",
    responseText: "Opening feedback.",
  },
  {
    test: /\b(dashboard|daily\s+hub)\b/,
    path: "/dashboard",
    responseText: "Opening your dashboard.",
  },
  {
    test: /\b(progress|prep\s+progress|how\s+is\s+my\s+prep)\b/,
    path: "/progress",
    responseText: "Opening your progress.",
  },
  {
    test: /\b(heatmap|study\s+heatmap)\b/,
    path: "/heatmap",
    responseText: "Opening your study heatmap.",
  },
  {
    test: /\b(calendar)\b/,
    path: "/calendar",
    responseText: "Opening the calendar.",
  },
  {
    test: /\b(timer|focus\s+timer|pomodoro\s+timer)\b/,
    path: "/timer",
    responseText: "Opening the timer.",
  },
  {
    test: /\b(doubts?|doubt\s+tracker)\b/,
    path: "/doubts",
    responseText: "Opening Doubt Tracker.",
  },
  {
    test: /\b(syllabus|home)\b/,
    path: "/syllabus",
    responseText: "Going home.",
  },
  {
    test: /\b(settings|preferences)\b/,
    path: "/settings",
    responseText: "Opening Settings.",
  },
  {
    test: /\bprofile\b/,
    path: "/profile",
    responseText: "Opening Profile.",
  },
  {
    test: /\b(habits?)\b/,
    path: "/habits",
    responseText: "Opening habits.",
  },
  {
    test: /\b(meditation)\b/,
    path: "/meditation",
    responseText: "Opening meditation.",
  },
  {
    test: /\b(motivation)\b/,
    path: "/motivation",
    responseText: "Opening motivation.",
  },
];

function resolveNavigateIntent(transcript: string): LocalVoiceIntentResult | null {
  const t = normalizeTranscript(transcript);
  if (!t) return null;

  const hasNavCue =
    /\b(go\s+to|open|show|navigate|take\s+me|switch\s+to|visit|launch)\b/.test(
      transcript.toLowerCase(),
    ) || t.length >= 3;

  if (!hasNavCue) return null;

  for (const rule of NAV_RULES) {
    if (!rule.test.test(t) && !rule.test.test(transcript.toLowerCase())) continue;

    let intent: VoiceCommandIntent = { intent: "navigate", path: rule.path };
    intent = adjustNavigateIntentForTranscript(intent, transcript);
    if (intent.intent !== "navigate") continue;
    const path = canonicalVoiceNavigatePath(intent.path);
    if (!isVoiceNavigatePathAllowed(path)) continue;

    return {
      intent: { intent: "navigate", path },
      responseText: rule.responseText,
      confidence: "high",
    };
  }

  return null;
}

function resolveQueryPlan(transcript: string): LocalVoiceIntentResult | null {
  const t = transcript.toLowerCase();
  if (
    /\b(what(?:'s|\s+is)\s+on\s+my\s+plan|what\s+do\s+i\s+have\s+today|show\s+my\s+(?:daily\s+)?plan|what\s+is\s+my\s+plan\s+today)\b/.test(
      t,
    )
  ) {
    return {
      intent: { intent: "query_plan" },
      responseText: "Opening your daily plan to check what's on today.",
      confidence: "high",
    };
  }
  return null;
}

function resolveQueryProgress(transcript: string): LocalVoiceIntentResult | null {
  const t = transcript.toLowerCase();
  if (
    /\b(how\s+(?:is|am)\s+my\s+prep|how\s+am\s+i\s+doing|show\s+my\s+progress|how\s+is\s+my\s+progress)\b/.test(
      t,
    )
  ) {
    return {
      intent: { intent: "query_progress" },
      responseText: "Opening your progress dashboard.",
      confidence: "high",
    };
  }
  return null;
}

function resolveMindsetTrigger(transcript: string): LocalVoiceIntentResult | null {
  const t = transcript.toLowerCase();
  if (/\b(purpose\s+mode|why\s+am\s+i\s+doing\s+this)\b/.test(t)) {
    return {
      intent: { intent: "mindset_trigger", trigger_type: "purpose_mode" },
      responseText: "Opening purpose mode.",
      confidence: "high",
    };
  }
  if (/\b(anxious|anxiety|stressed|stress\s+reset|calm\s+me\s+down)\b/.test(t)) {
    return {
      intent: { intent: "mindset_trigger", trigger_type: "anxiety_reset" },
      responseText: "Starting an anxiety reset.",
      confidence: "high",
    };
  }
  if (/\b(focus\s+breath|breathing\s+exercise|breath\s+work|breathwork)\b/.test(t)) {
    return {
      intent: { intent: "mindset_trigger", trigger_type: "focus_breath" },
      responseText: "Starting a focus breath session.",
      confidence: "high",
    };
  }
  return null;
}

function resolveLogSleep(transcript: string): LocalVoiceIntentResult | null {
  const t = transcript.toLowerCase();
  const m = t.match(/\blog(?:ged)?\s+(?:sleep\s+)?(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/);
  if (!m) return null;
  const hours = Number(m[1]);
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) return null;
  return {
    intent: { intent: "log_sleep", hours },
    responseText: `Got it! Logging ${hours} hours of sleep.`,
    confidence: "high",
  };
}

function resolveFocusMode(transcript: string): LocalVoiceIntentResult | null {
  const t = transcript.toLowerCase();

  let mode: VoiceFocusMode = "custom";
  if (/\bpomodoro\b/.test(t)) mode = "pomodoro";
  else if (/\b(deep\s+work|deep\s+focus)\b/.test(t)) mode = "deep";
  else if (/\bsprint\b/.test(t)) mode = "sprint";

  const durationMatch = t.match(/\b(\d{1,3})\s*(?:minutes?|mins?|m)\b/);
  const duration = durationMatch ? Number(durationMatch[1]) : mode === "pomodoro" ? 25 : null;
  if (duration == null || duration < 1 || duration > 180) return null;

  const startCue = /\b(start|begin|run|launch)\b/.test(t) || mode !== "custom";
  if (!startCue) return null;

  let linked_task: string | null = null;
  const onMatch = t.match(/\b(?:on|for)\s+([a-z0-9][\w\s-]{1,40})/i);
  if (onMatch?.[1]) {
    linked_task = onMatch[1].trim().replace(/\s+(pomodoro|timer|focus|session)$/i, "").trim();
    if (!linked_task) linked_task = null;
  }

  return {
    intent: {
      intent: "focus_mode",
      duration,
      mode,
      linked_task,
      auto_start: true,
    },
    responseText: `Starting a ${duration}-minute ${mode} focus session.`,
    confidence: "high",
  };
}

/**
 * Client-side fast path for Boss Mode voice commands.
 * Returns high-confidence matches for instant execution; null → use Groq fallback.
 */
export function resolveLocalVoiceIntent(transcript: string): LocalVoiceIntentResult | null {
  const text = transcript.trim();
  if (!text) return null;

  const resolvers = [
    resolveQueryPlan,
    resolveQueryProgress,
    resolveMindsetTrigger,
    resolveLogSleep,
    resolveFocusMode,
    resolveNavigateIntent,
  ];

  for (const resolve of resolvers) {
    const result = resolve(text);
    if (result) return result;
  }

  return null;
}
