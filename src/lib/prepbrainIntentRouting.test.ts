import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { detectPrepBrainIntent, selectToolsForIntent } from "./prepbrainIntentRouting";

// ---------------------------------------------------------------------------
// detectPrepBrainIntent
// ---------------------------------------------------------------------------

describe("detectPrepBrainIntent — small_talk", () => {
  it("bare greeting → small_talk", () => {
    assert.equal(detectPrepBrainIntent("hi"), "small_talk");
  });

  it("flattery → small_talk", () => {
    assert.equal(detectPrepBrainIntent("you are so smart"), "small_talk");
  });

  it("greeting + study question → NOT small_talk (passes through)", () => {
    assert.notEqual(detectPrepBrainIntent("hi, what should I study today?"), "small_talk");
  });
});

describe("detectPrepBrainIntent — today_plan", () => {
  it("'what should I do today' → today_plan", () => {
    assert.equal(detectPrepBrainIntent("what should I do today?"), "today_plan");
  });

  it("'show me my daily plan' → today_plan", () => {
    assert.equal(detectPrepBrainIntent("show me my daily plan"), "today_plan");
  });

  it("plain today question without focus phrasing stays today_plan", () => {
    assert.equal(detectPrepBrainIntent("what can I do today to study better?"), "today_plan");
  });
});

describe("detectPrepBrainIntent — marks_score (focus phrasing fixes)", () => {
  it("screenshot phrase: 'spaces I focus more on' → marks_score", () => {
    assert.equal(detectPrepBrainIntent("can you tell me a few spaces I focus more on now"), "marks_score");
  });

  it("focus + today combined → marks_score (focus wins over today)", () => {
    assert.equal(detectPrepBrainIntent("what should I focus on today?"), "marks_score");
  });

  it("'focus on' (original) → marks_score", () => {
    assert.equal(detectPrepBrainIntent("what chapters should I focus on?"), "marks_score");
  });

  it("'where to focus' → marks_score", () => {
    assert.equal(detectPrepBrainIntent("where to focus for NEET?"), "marks_score");
  });

  it("'what to focus' → marks_score", () => {
    assert.equal(detectPrepBrainIntent("what to focus for the exam?"), "marks_score");
  });

  it("'what should I focus' → marks_score", () => {
    assert.equal(detectPrepBrainIntent("what should I focus on this week?"), "marks_score");
  });

  it("'areas to focus' → marks_score", () => {
    assert.equal(detectPrepBrainIntent("which areas should I focus?"), "marks_score");
  });

  it("'my marks' → marks_score", () => {
    assert.equal(detectPrepBrainIntent("how are my marks looking?"), "marks_score");
  });

  it("'improve' → marks_score", () => {
    assert.equal(detectPrepBrainIntent("how can I improve my score?"), "marks_score");
  });

  it("'priority' → marks_score", () => {
    assert.equal(detectPrepBrainIntent("what's my top priority chapter?"), "marks_score");
  });
});

describe("detectPrepBrainIntent — weak_vs_strong", () => {
  it("'weak subjects' → weak_vs_strong", () => {
    assert.equal(detectPrepBrainIntent("tell me my weak subjects"), "weak_vs_strong");
  });

  it("'which chapters' → weak_vs_strong", () => {
    assert.equal(detectPrepBrainIntent("which chapters need more work?"), "weak_vs_strong");
  });
});

describe("detectPrepBrainIntent — syllabus_progress", () => {
  it("'syllabus progress' → syllabus_progress", () => {
    assert.equal(detectPrepBrainIntent("show my syllabus progress"), "syllabus_progress");
  });

  it("'completion' → syllabus_progress", () => {
    assert.equal(detectPrepBrainIntent("what's my overall completion?"), "syllabus_progress");
  });
});

describe("detectPrepBrainIntent — habits_or_meditation", () => {
  it("'burnout' → habits_or_meditation", () => {
    assert.equal(detectPrepBrainIntent("I'm feeling burnout"), "habits_or_meditation");
  });

  it("'habit streak' → habits_or_meditation", () => {
    assert.equal(detectPrepBrainIntent("how is my habit streak?"), "habits_or_meditation");
  });
});

describe("detectPrepBrainIntent — no_data (generic strategy, no personal context)", () => {
  it("generic study technique question → no_data", () => {
    assert.equal(detectPrepBrainIntent("how to memorize faster?"), "no_data");
  });

  it("pomodoro question → no_data", () => {
    assert.equal(detectPrepBrainIntent("what is the pomodoro technique?"), "no_data");
  });

  // Once a personal signal word is present, should NOT be no_data
  it("study tips + 'my' → NOT no_data", () => {
    assert.notEqual(detectPrepBrainIntent("how to study better for my exam?"), "no_data");
  });
});

describe("detectPrepBrainIntent — general (unclassified fallthrough)", () => {
  it("vague open-ended question → general", () => {
    assert.equal(detectPrepBrainIntent("how am I doing overall?"), "general");
  });

  it("completely unrelated but not small_talk → general", () => {
    // Not a greeting, not flattery, not study-topic — falls through to general
    assert.equal(detectPrepBrainIntent("please give me some motivation"), "general");
  });
});

// ---------------------------------------------------------------------------
// selectToolsForIntent
// ---------------------------------------------------------------------------

describe("selectToolsForIntent — tool lists", () => {
  it("marks_score loads marks + weak tools", () => {
    const tools = selectToolsForIntent("marks_score");
    assert.ok(tools.includes("getMarksIntelligence"));
    assert.ok(tools.includes("getWeakStrongSubjects"));
  });

  it("general now loads syllabus context (not just today's plan)", () => {
    const tools = selectToolsForIntent("general");
    assert.ok(tools.includes("getTodayPlan"));
    assert.ok(tools.includes("getSyllabusOverview"));
    assert.ok(tools.includes("getWeakStrongSubjects"));
    assert.ok(tools.includes("getMarksIntelligence"));
  });

  it("no_data now loads minimal syllabus snapshot", () => {
    const tools = selectToolsForIntent("no_data");
    assert.ok(tools.includes("getSyllabusOverview"));
    assert.ok(tools.includes("getWeakStrongSubjects"));
    // Should NOT load today's task list or marks for generic tips
    assert.ok(!tools.includes("getTodayPlan"));
    assert.ok(!tools.includes("getMarksIntelligence"));
  });

  it("today_plan loads plan + weak subjects", () => {
    const tools = selectToolsForIntent("today_plan");
    assert.ok(tools.includes("getTodayPlan"));
    assert.ok(tools.includes("getWeakStrongSubjects"));
  });

  it("habits_or_meditation loads habit + meditation tools only", () => {
    const tools = selectToolsForIntent("habits_or_meditation");
    assert.ok(tools.includes("getHabitStreakSummary"));
    assert.ok(tools.includes("getMeditationConsistency"));
    assert.ok(!tools.includes("getMarksIntelligence"));
  });

  it("target_score loads blueprint + syllabus overview", () => {
    const tools = selectToolsForIntent("target_score");
    assert.ok(tools.includes("getTargetScoreBlueprint"));
    assert.ok(tools.includes("getSyllabusOverview"));
  });
});

// ---------------------------------------------------------------------------
// End-to-end: intent → tools for the exact screenshot phrase
// ---------------------------------------------------------------------------

describe("end-to-end: screenshot phrase routes correctly", () => {
  it("'can you tell me a few spaces I focus more on now' → marks_score → marks + weak tools", () => {
    const intent = detectPrepBrainIntent("can you tell me a few spaces I focus more on now");
    assert.equal(intent, "marks_score");
    const tools = selectToolsForIntent(intent);
    assert.ok(tools.includes("getMarksIntelligence"));
    assert.ok(tools.includes("getWeakStrongSubjects"));
  });
});
