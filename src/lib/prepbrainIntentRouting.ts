import type { PrepbrainToolName } from "@/lib/prepbrainToolQueries";

type ConversationMessage = { role: string; content: string };

export type ConversationThread = {
  /** The dominant intent from prior turns; null if no clear thread. */
  threadIntent: PrepBrainIntent | null;
  /** 1 = first message on this topic, 2 = second consecutive turn, 3-4 = drilling deep. */
  depth: number;
  /** Subject name mentioned repeatedly (e.g. "VARC", "DILR"), or null. */
  focusSubject: string | null;
};

/**
 * Analyses the recent conversation history to detect whether the student is
 * drilling deeper into a specific topic. Returns the dominant prior intent,
 * a depth counter (capped at 4), and an optional focus subject extracted from
 * repeated subject-name mentions.
 *
 * Intended to be called alongside `detectPrepBrainIntent` so the route can
 * inherit the thread intent when the latest message is ambiguous (e.g. "tell
 * me more", "go deeper", "what about that specifically?").
 */
export function detectConversationThread(
  messages: ConversationMessage[],
): ConversationThread {
  const recentUser = messages.filter((m) => m.role === "user").slice(-6);
  if (recentUser.length <= 1) return { threadIntent: null, depth: 1, focusSubject: null };

  // Intents worth inheriting — excludes ambiguous catch-alls.
  const STICKY_INTENTS: PrepBrainIntent[] = [
    "marks_score",
    "target_score",
    "weak_vs_strong",
    "syllabus_progress",
    "revision",
    "mock_test",
    "today_plan",
    "syllabus_backlog",
    "avoided_topics",
    "habits_or_meditation",
    "study_camera",
    "doubt_tracker",
    "mistake_log",
    "personal_motivation",
  ];

  // Map prior messages (all except the most recent) to intents.
  const priorIntents = recentUser
    .slice(0, -1)
    .map((m) => detectPrepBrainIntent(m.content))
    .filter((i) => (STICKY_INTENTS as string[]).includes(i));

  if (priorIntents.length === 0) return { threadIntent: null, depth: 1, focusSubject: null };

  // Most frequent prior intent becomes the thread intent.
  const counts = priorIntents.reduce<Record<string, number>>((acc, i) => {
    acc[i] = (acc[i] ?? 0) + 1;
    return acc;
  }, {});
  const threadIntent = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as PrepBrainIntent;
  const depth = Math.min(priorIntents.filter((i) => i === threadIntent).length + 1, 4);

  // Extract a focus subject if the same subject name appears across multiple messages.
  const subjectPattern =
    /\b(varc|dilr|qa|quant|lrdi|verbal|reading comprehension|physics|chemistry|biology|history|geography|polity|economy|maths|mathematics|english)\b/i;
  const subjectMentions: Record<string, number> = {};
  for (const m of recentUser) {
    const match = m.content.match(subjectPattern);
    if (match) {
      const s = match[1].toUpperCase();
      subjectMentions[s] = (subjectMentions[s] ?? 0) + 1;
    }
  }
  const topSubject = Object.entries(subjectMentions).sort((a, b) => b[1] - a[1])[0];
  // Only treat it as a focus subject if it was mentioned in at least 2 messages.
  const focusSubject = topSubject && topSubject[1] >= 2 ? topSubject[0] : null;

  return { threadIntent, depth, focusSubject };
}

export type PrepBrainIntent =
  | "today_plan"
  | "syllabus_progress"
  | "weak_vs_strong"
  | "marks_score"
  | "habits_or_meditation"
  | "study_camera"
  | "target_score"
  | "revision"
  | "mock_test"
  | "syllabus_backlog"
  | "avoided_topics"
  | "doubt_tracker"
  | "mistake_log"
  | "personal_motivation"
  | "small_talk"
  | "no_data"
  | "general";

/**
 * Focus / priority phrasing that should load marks + weak tools (not only today's plan).
 * Kept conservative to avoid matching "focus timer" or bare "focus" in unrelated phrases.
 */
export function mentionsFocusOrPriorityAdvice(t: string): boolean {
  if (t.includes("focus on")) return true;
  if (t.includes("focus more")) return true;
  if (t.includes("where to focus")) return true;
  if (t.includes("what to focus")) return true;
  if (/\bwhat should i focus\b/.test(t)) return true;
  if (/\bwhere should i focus\b/.test(t)) return true;
  if (/\bareas?\b/.test(t) && /\b(focus|priorit)\b/.test(t)) return true;
  if (/\bspaces?\b/.test(t) && /\b(focus|priorit)\b/.test(t)) return true;
  return false;
}

function isPrepBrainCapabilityQuestion(msg: string): boolean {
  const t = msg.trim().toLowerCase();
  if (!t) return false;
  return (
    /\bhow can (you|prepbrain|it) help\b/.test(t) ||
    /\bwhat can (you|prepbrain|it) do\b/.test(t) ||
    /\bwhat (are|is) you for\b/.test(t) ||
    /\bwhat do you do\b/.test(t) ||
    /\bwhat('?s| is) prepbrain\b/.test(t) ||
    /\bhow does (this|prepbrain|kalnehi) work\b/.test(t) ||
    /\bprepbrain\b.*\b(do|help|features?)\b/.test(t) ||
    /\b(features?|capabilities)\b.*\b(prepbrain|you|kalnehi)\b/.test(t) ||
    /\b(prepbrain|you)\b.*\b(features?|capabilities)\b/.test(t) ||
    /\bwhat can kalnehi\b/.test(t) ||
    /\bwhat does kalnehi\b/.test(t) ||
    /\bwhat('?s| is) kalnehi\b/.test(t) ||
    /\bwhat can kal\s*nehi\b/.test(t) ||
    /\bwhat does kal\s*nehi\b/.test(t) ||
    /\bwhat('?s| is) kal\s*nehi\b/.test(t) ||
    /\b(tell me about|explain)\s+kalnehi\b/.test(t) ||
    /\b(tell me about|explain)\s+kal\s*nehi\b/.test(t) ||
    /\bkalnehi\b.*\b(features?|do|help|offer|include)\b/.test(t) ||
    /\bkal\s*nehi\b.*\b(features?|do|help|offer|include)\b/.test(t)
  );
}

function isPrepBrainValueChallengeQuestion(msg: string): boolean {
  const t = msg.trim().toLowerCase();
  if (!t) return false;
  return (
    /\b(i|we)\s+(can|could)\b.*\bwithout\s+(you|prepbrain|kalnehi|this\s+app|the\s+app)\b/.test(t) ||
    /\b(don'?t|do not)\s+need\s+(you|prepbrain|kalnehi|this|the app|an?\s+ai)\b/.test(t) ||
    /\bno\s+need\s+for\s+(you|prepbrain|kalnehi|this|an?\s+ai)\b/.test(t) ||
    /\bwhy\s+(should|do|would)\s+i\s+(use|need|bother\s+with)(\s+(you|prepbrain|kalnehi|this|the app))?\b/.test(
      t,
    ) ||
    /\bwhat('?s| is)\s+the\s+point\b.*\b(you|prepbrain|kalnehi|this|ai|chat)\b/.test(t) ||
    /\b(not\s+worth|waste\s+of\s+time|useless|unnecessary)\b.*\b(you|prepbrain|kalnehi|this\s+chat)\b/.test(t) ||
    /\b(you|prepbrain)\s+(are|is)\s+(useless|unnecessary|pointless)\b/.test(t)
  );
}

function isSmallTalk(msg: string): boolean {
  if (isPrepBrainCapabilityQuestion(msg) || isPrepBrainValueChallengeQuestion(msg)) return false;

  const t = msg.trim();

  if (/^(hi+|hello+|hey+|yo+|sup|hiya|howdy|greetings|good\s+(morning|afternoon|evening|night)|namaste)[!?.,\s]*$/i.test(t))
    return true;

  if (
    /(you('re| are)\s+(so\s+)?(smart|amazing|great|awesome|brilliant|the best|genius|intelligent|perfect|cool)|smartest ai|best ai|you rock|i love you|love you prepbrain)/i.test(
      t,
    )
  )
    return true;

  if (/\btell (me )?a joke\b|\bcrack a joke\b|\bsay something funny\b|\bmake me laugh\b/i.test(t))
    return true;

  if (/^(who (are|made) you|what('?s| is) your name|are you (an?\s+)?ai|are you human)[!?.,\s]*$/i.test(t))
    return true;

  return false;
}

/** Routes to Doubt Tracker snapshots (not generic English "no doubt"). */
function isDoubtTrackerIntent(t: string): boolean {
  if (/\bno doubt\b/.test(t) || /\bwithout a doubt\b/.test(t)) return false;
  if (/\bdoubt tracker\b/.test(t) || /\bdoubts?\s+tracker\b/.test(t)) return true;
  if (/\bmy doubts\b/.test(t) || /\bdoubts i\s+(logged|have|wrote)\b/.test(t)) return true;
  if (/\b(unsolved|pending|open)\s+doubts?\b/.test(t)) return true;
  if (/\bdoubts?\b/.test(t) && /\b(list|log|logged|solve|clear|track|tracker)\b/.test(t)) return true;
  if (/\b(i have|have) a doubt\b/.test(t) || /\bmy doubt\b/.test(t)) return true;
  return false;
}

function isMistakeLogIntent(t: string): boolean {
  if (/\bmock\s+test\b/.test(t) || /\bmock\s+score\b/.test(t)) return false;
  if (/\bmistake\s+log\b/.test(t) || /\bmistakes?\s+i\s+logged\b/.test(t)) return true;
  if (/\bmy mistakes\b/.test(t) && /\b(log|pattern|revise|from)\b/.test(t)) return true;
  if (/\blogged\s+mistakes?\b/.test(t) || /\bmistakes?\s+in\s+(my\s+)?log\b/.test(t)) return true;
  if (/\bmistakes?\b/.test(t) && /\b(log|logged|tracker|mistake log)\b/.test(t)) return true;
  return false;
}

function isPersonalMotivationIntent(t: string): boolean {
  if (/\bmotivation letter\b/.test(t) || /\bletter to (my )?future\b/.test(t)) return true;
  if (/\bfuture self\b/.test(t) && /\bletter\b/.test(t)) return true;
  if (/\bpersonal motivation\b/.test(t)) return true;
  if (/\bvision\s+(board|photo)\b/.test(t)) return true;
  if (/\b(voice\s+)?affirmation\b/.test(t) && /\b(my|record|logged|saved)\b/.test(t)) return true;
  return false;
}

function isGenericStrategyQuestion(msg: string): boolean {
  const t = msg.trim().toLowerCase();
  if (!t) return false;
  if (isPrepBrainCapabilityQuestion(msg) || isPrepBrainValueChallengeQuestion(msg)) return false;
  if (
    /\b(my|mine|today|this week|my syllabus|my marks|my score|my plan|my subscription|my streak|kalnehi|prepbrain)\b/.test(
      t,
    )
  ) {
    return false;
  }
  return (
    /\bhow (to|do i|should i|can i)\b.{0,50}\b(study|focus|memorize|revise|avoid|handle)\b/.test(
      t,
    ) ||
    /\b(pomodoro|spaced repetition|active recall|feynman|cornell|flashcard)\b/.test(t) ||
    /\b(exam (stress|anxiety|pressure|fear|dread))\b/.test(t) ||
    /\b(study (routine|schedule|technique|method|habit|tip)s?)\b/.test(t) ||
    /\b(how (many|long|often|much) (should|do|to) (i|one) (study|sleep|take breaks))\b/.test(
      t,
    ) ||
    /\bhow to (read|retain|concentrat|concentration)\b/.test(t)
  );
}

export function detectPrepBrainIntent(lastUserMessage: string): PrepBrainIntent {
  if (isSmallTalk(lastUserMessage)) return "small_talk";
  if (isGenericStrategyQuestion(lastUserMessage)) return "no_data";

  const t = lastUserMessage.toLowerCase();

  if (
    /\bwhat\s+(have\s+i|am\s+i)\s+(been\s+)?avoiding\b/.test(t) ||
    /\bwhat\s+am\s+i\s+not\s+studying\b/.test(t) ||
    /\bkeep\s+(skipping|avoiding|postponing|pushing|putting\s+off)\b/.test(t) ||
    /\bkeep\s+pushing\b.*\bbacklog\b/.test(t) ||
    /\bpushing\s+to\s+backlog\b/.test(t) ||
    /\b(topics?|subjects?|chapters?)\s+(i('?ve)?|have\s+been)\s+(been\s+)?avoiding\b/.test(t) ||
    (t.includes("avoiding") && /\b(topic|subject|chapter|study)\b/.test(t))
  ) {
    return "avoided_topics";
  }

  if (
    t.includes("backlog") ||
    t.includes("backlog list") ||
    t.includes("task list") ||
    /\bcatch(?:ing)?\s+up\b/.test(t) ||
    t.includes("pending topics") ||
    t.includes("unplanned fix") ||
    t.includes("recovery plan") ||
    t.includes("clear my backlog")
  ) {
    return "syllabus_backlog";
  }

  if (isDoubtTrackerIntent(t)) {
    return "doubt_tracker";
  }
  if (isMistakeLogIntent(t)) {
    return "mistake_log";
  }
  if (isPersonalMotivationIntent(t)) {
    return "personal_motivation";
  }

  // Focus/priority phrasing is checked BEFORE the "today" keyword so that
  // "what should I focus on today?" routes to marks_score (gets marks + weak
  // subjects) rather than today_plan (gets only the task list).
  if (
    t.includes("mark") ||
    t.includes("score") ||
    t.includes("weightage") ||
    mentionsFocusOrPriorityAdvice(t) ||
    t.includes("what to study") ||
    t.includes("priority") ||
    t.includes("priorit") ||
    t.includes("improve") ||
    t.includes("how many") ||
    t.includes("rank")
  ) {
    return "marks_score";
  }
  if (
    t.includes("today") ||
    t.includes("daily plan") ||
    t.includes("today plan") ||
    t.includes("schedule")
  ) {
    return "today_plan";
  }
  if (
    t.includes("weak") ||
    t.includes("strong") ||
    t.includes("subject") ||
    t.includes("chapter") ||
    /\bwhich (chapters?|topics?|subjects?)\b/.test(t)
  ) {
    return "weak_vs_strong";
  }
  if (t.includes("syllabus") || t.includes("progress") || t.includes("completion")) {
    return "syllabus_progress";
  }
  if (
    t.includes("habit") ||
    t.includes("streak") ||
    t.includes("meditation") ||
    t.includes("stress") ||
    t.includes("burnout") ||
    t.includes("sleep") ||
    t.includes("anxiety") ||
    t.includes("overwhelm") ||
    t.includes("tired") ||
    t.includes("brain yoga") ||
    t.includes("wellness") ||
    t.includes("calm") ||
    t.includes("breathe") ||
    t.includes("breathing") ||
    t.includes("rest") ||
    t.includes("mental health") ||
    t.includes("exhausted") ||
    t.includes("drained")
  ) {
    return "habits_or_meditation";
  }
  if (t.includes("camera") || t.includes("study session") || t.includes("focus proof")) {
    return "study_camera";
  }
  if (t.includes("target") || t.includes("score blueprint") || t.includes("blueprint")) {
    return "target_score";
  }
  if (
    t.includes("mock test") ||
    t.includes("mock score") ||
    t.includes("test result") ||
    t.includes("test score") ||
    t.includes("last test") ||
    t.includes("previous test") ||
    t.includes("my test") ||
    /\bhow did i do\b.*\btest\b/.test(t) ||
    /\btest\b.*\bhow did i do\b/.test(t)
  ) {
    return "mock_test";
  }
  if (
    t.includes("revise") ||
    t.includes("revision") ||
    t.includes("what to revise") ||
    t.includes("revision plan") ||
    t.includes("revision queue") ||
    t.includes("spaced repetition") ||
    t.includes("revision backlog") ||
    /\bwhat should i revise\b/.test(t) ||
    /\bwhat should i review\b/.test(t)
  ) {
    return "revision";
  }
  return "general";
}

export function selectToolsForIntent(
  intent: Exclude<PrepBrainIntent, "small_talk">,
): PrepbrainToolName[] {
  switch (intent) {
    // Generic strategy questions — no personal data needed; model uses general knowledge.
    case "no_data":
      return [];
    case "today_plan":
      return [
        "getSyllabusOverview",
        "getTodayPlan",
        "getMissedTasksContext",
        "getWeakStrongSubjects",
        "getStudyTimerStats",
        "getDailyDebriefSnapshot",
      ];
    case "marks_score":
      return [
        "getSyllabusOverview",
        "getMarksIntelligence",
        "getWeakStrongSubjects",
        "getMockTrendBySubject",
      ];
    case "syllabus_progress":
      return ["getSyllabusOverview", "getWeakStrongSubjects"];
    case "weak_vs_strong":
      return ["getSyllabusOverview", "getWeakStrongSubjects", "getMarksIntelligence"];
    case "habits_or_meditation":
      return ["getHabitStreakSummary", "getMeditationConsistency", "getDailyDebriefSnapshot", "getStudyTimerStats"];
    case "study_camera":
      return ["getRecentStudyCameraData", "getMissedTasksContext"];
    case "target_score":
      return ["getTargetScoreBlueprint", "getSyllabusOverview", "getMarksIntelligence"];
    case "revision":
      return ["getRevisionQueueSnapshot", "getWeakStrongSubjects", "getMissedTasksContext"];
    case "mock_test":
      return ["getLatestMockScores", "getWeakStrongSubjects", "getMockTrendBySubject"];
    case "syllabus_backlog":
      return [
        "getSyllabusBacklogSnapshot",
        "getMarksIntelligence",
        "getSyllabusOverview",
        "getMissedTasksContext",
      ];
    case "avoided_topics":
      return [
        "getSyllabusBacklogSnapshot",
        "getMarksIntelligence",
        "getMockTrendBySubject",
        "getDailyDebriefSnapshot",
      ];
    case "doubt_tracker":
      return ["getDoubtsSnapshot", "getSyllabusOverview", "getWeakStrongSubjects"];
    case "mistake_log":
      return ["getMistakeLogSnapshot", "getWeakStrongSubjects", "getMarksIntelligence"];
    case "personal_motivation":
      return ["getMotivationContextSnapshot", "getSyllabusOverview", "getWeakStrongSubjects"];
    // General: omit getTodayPlan — reduces token cost for non-today queries.
    case "general":
      return ["getSyllabusOverview", "getWeakStrongSubjects", "getMarksIntelligence"];
    default: {
      const _exhaustive: never = intent;
      return _exhaustive;
    }
  }
}
