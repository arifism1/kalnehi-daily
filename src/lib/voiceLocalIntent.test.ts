import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveLocalVoiceIntent } from "./voiceLocalIntent";

describe("resolveLocalVoiceIntent — navigate", () => {
  it("go to daily plan → /daily-plan", () => {
    const r = resolveLocalVoiceIntent("Go to daily plan");
    assert.ok(r);
    assert.equal(r.confidence, "high");
    assert.equal(r.intent.intent, "navigate");
    if (r.intent.intent === "navigate") assert.equal(r.intent.path, "/daily-plan");
  });

  it("open mastermind → /mastermind", () => {
    const r = resolveLocalVoiceIntent("Open Mastermind");
    assert.ok(r);
    if (r.intent.intent === "navigate") assert.equal(r.intent.path, "/mastermind");
  });

  it("open prep brain → /mastermind", () => {
    const r = resolveLocalVoiceIntent("Open PrepBrain");
    assert.ok(r);
    if (r.intent.intent === "navigate") assert.equal(r.intent.path, "/mastermind");
  });

  it("go to progress → /progress", () => {
    const r = resolveLocalVoiceIntent("Go to progress");
    assert.ok(r);
    if (r.intent.intent === "navigate") assert.equal(r.intent.path, "/progress");
  });

  it("open my recap → /recap", () => {
    const r = resolveLocalVoiceIntent("Open my recap");
    assert.ok(r);
    if (r.intent.intent === "navigate") assert.equal(r.intent.path, "/recap");
  });

  it("weekly recap → /recap/weekly", () => {
    const r = resolveLocalVoiceIntent("Open weekly recap");
    assert.ok(r);
    if (r.intent.intent === "navigate") assert.equal(r.intent.path, "/recap/weekly");
  });

  it("monthly recap → /recap/monthly", () => {
    const r = resolveLocalVoiceIntent("Show monthly recap");
    assert.ok(r);
    if (r.intent.intent === "navigate") assert.equal(r.intent.path, "/recap/monthly");
  });

  it("daily debrief → /daily-debrief", () => {
    const r = resolveLocalVoiceIntent("Go to daily debrief");
    assert.ok(r);
    if (r.intent.intent === "navigate") assert.equal(r.intent.path, "/daily-debrief");
  });

  it("recap wins over debrief when user says recap", () => {
    const r = resolveLocalVoiceIntent("Open today's recap");
    assert.ok(r);
    if (r.intent.intent === "navigate") assert.equal(r.intent.path, "/recap");
  });

  it("revision tracker synonyms", () => {
    const r = resolveLocalVoiceIntent("Open revision reminders");
    assert.ok(r);
    if (r.intent.intent === "navigate") assert.equal(r.intent.path, "/revision-tracker");
  });

  it("go to home → /syllabus", () => {
    const r = resolveLocalVoiceIntent("Go to home");
    assert.ok(r);
    if (r.intent.intent === "navigate") assert.equal(r.intent.path, "/syllabus");
  });
});

describe("resolveLocalVoiceIntent — query intents", () => {
  it("what is on my plan today → query_plan", () => {
    const r = resolveLocalVoiceIntent("What is on my plan today?");
    assert.ok(r);
    assert.equal(r.intent.intent, "query_plan");
  });

  it("how is my prep going → query_progress", () => {
    const r = resolveLocalVoiceIntent("How is my prep going?");
    assert.ok(r);
    assert.equal(r.intent.intent, "query_progress");
  });

  it("show my progress → query_progress not navigate", () => {
    const r = resolveLocalVoiceIntent("Show my progress");
    assert.ok(r);
    assert.equal(r.intent.intent, "query_progress");
  });
});

describe("resolveLocalVoiceIntent — mindset", () => {
  it("anxiety reset", () => {
    const r = resolveLocalVoiceIntent("I'm feeling anxious");
    assert.ok(r);
    assert.equal(r.intent.intent, "mindset_trigger");
    if (r.intent.intent === "mindset_trigger") {
      assert.equal(r.intent.trigger_type, "anxiety_reset");
    }
  });

  it("purpose mode", () => {
    const r = resolveLocalVoiceIntent("Turn on purpose mode");
    assert.ok(r);
    if (r.intent.intent === "mindset_trigger") {
      assert.equal(r.intent.trigger_type, "purpose_mode");
    }
  });

  it("focus breath", () => {
    const r = resolveLocalVoiceIntent("Start focus breath");
    assert.ok(r);
    if (r.intent.intent === "mindset_trigger") {
      assert.equal(r.intent.trigger_type, "focus_breath");
    }
  });
});

describe("resolveLocalVoiceIntent — log_sleep", () => {
  it("log 7 hours sleep", () => {
    const r = resolveLocalVoiceIntent("Log 7 hours sleep");
    assert.ok(r);
    assert.equal(r.intent.intent, "log_sleep");
    if (r.intent.intent === "log_sleep") assert.equal(r.intent.hours, 7);
  });
});

describe("resolveLocalVoiceIntent — focus_mode", () => {
  it("25 minute pomodoro", () => {
    const r = resolveLocalVoiceIntent("Start a 25 minute pomodoro");
    assert.ok(r);
    assert.equal(r.intent.intent, "focus_mode");
    if (r.intent.intent === "focus_mode") {
      assert.equal(r.intent.duration, 25);
      assert.equal(r.intent.mode, "pomodoro");
      assert.equal(r.intent.auto_start, true);
    }
  });

  it("deep work 90 minutes", () => {
    const r = resolveLocalVoiceIntent("Deep work 90 minutes");
    assert.ok(r);
    if (r.intent.intent === "focus_mode") {
      assert.equal(r.intent.duration, 90);
      assert.equal(r.intent.mode, "deep");
    }
  });
});

describe("resolveLocalVoiceIntent — LLM fallback (null)", () => {
  it("add task defers to LLM", () => {
    assert.equal(
      resolveLocalVoiceIntent("Add chemistry revision 45 minutes for today"),
      null,
    );
  });

  it("mark completed defers to LLM", () => {
    assert.equal(resolveLocalVoiceIntent("Mark optics as completed"), null);
  });

  it("ambiguous utterance defers to LLM", () => {
    assert.equal(resolveLocalVoiceIntent("Do the thing"), null);
  });

  it("empty transcript", () => {
    assert.equal(resolveLocalVoiceIntent("   "), null);
  });
});
