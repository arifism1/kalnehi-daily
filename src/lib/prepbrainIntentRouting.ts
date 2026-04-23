import type { PrepbrainToolName } from "@/lib/prepbrainToolQueries";

export type PrepBrainIntent =
  | "today_plan"
  | "syllabus_progress"
  | "weak_vs_strong"
  | "marks_score"
  | "habits_or_meditation"
  | "study_camera"
  | "target_score"
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
    t.includes("today") ||
    t.includes("daily plan") ||
    t.includes("today plan") ||
    t.includes("schedule")
  ) {
    return "today_plan";
  }
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
  return "general";
}

export function selectToolsForIntent(
  intent: Exclude<PrepBrainIntent, "small_talk">,
): PrepbrainToolName[] {
  switch (intent) {
    case "no_data":
      return ["getSyllabusOverview", "getWeakStrongSubjects"];
    case "today_plan":
      return ["getTodayPlan", "getWeakStrongSubjects"];
    case "marks_score":
      return ["getMarksIntelligence", "getWeakStrongSubjects"];
    case "syllabus_progress":
      return ["getSyllabusOverview", "getWeakStrongSubjects"];
    case "weak_vs_strong":
      return ["getWeakStrongSubjects", "getMarksIntelligence"];
    case "habits_or_meditation":
      return ["getHabitStreakSummary", "getMeditationConsistency"];
    case "study_camera":
      return ["getRecentStudyCameraData", "getTodayPlan"];
    case "target_score":
      return ["getTargetScoreBlueprint", "getSyllabusOverview"];
    case "general":
      return [
        "getTodayPlan",
        "getSyllabusOverview",
        "getWeakStrongSubjects",
        "getMarksIntelligence",
      ];
    default: {
      const _exhaustive: never = intent;
      return _exhaustive;
    }
  }
}
