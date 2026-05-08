import assert from "node:assert/strict";
import { describe, it, afterEach } from "node:test";

import {
  MASTERMIND_TIER_THRESHOLDS,
  computeMastermindTier,
  mastermindLexicalHardEdge,
} from "./mastermindModelTier";

const BASE = (): Parameters<typeof computeMastermindTier>[0] => ({
  intent: "marks_score",
  depth: 1,
  lastUserContent: "help with marks",
  toolDataEstTokens: 900,
});

describe("mastermindLexicalHardEdge", () => {
  it("matches weekly wording", () => {
    assert.equal(mastermindLexicalHardEdge("Weekly revision schedule?"), true);
  });
  it("matches compound prep strategy", () => {
    assert.equal(mastermindLexicalHardEdge("exam strategy for CAT"), true);
  });
  it("does not match bare unrelated text", () => {
    assert.equal(mastermindLexicalHardEdge("thanks"), false);
  });
});

describe("computeMastermindTier — gate order", () => {
  afterEach(() => {
    delete process.env.MASTERMIND_FORCE_MODEL_TIER;
  });

  it("lexical overrides sparse payload on LOW-ish intent", () => {
    const r = computeMastermindTier({
      intent: "no_data",
      depth: 1,
      lastUserContent: "monthly revision plan?",
      toolDataEstTokens: 0,
    });
    assert.equal(r.tier, "hard");
    assert.deepEqual(r.reasons, ["lexical_edge"]);
  });

  it("HIGH intent below TH_SYN yields easy (default_easy)", () => {
    const { TH_SYN } = MASTERMIND_TIER_THRESHOLDS;
    const r = computeMastermindTier({
      ...BASE(),
      toolDataEstTokens: TH_SYN - 1,
    });
    assert.equal(r.tier, "easy");
    assert.deepEqual(r.reasons, ["default_easy"]);
  });

  it("HIGH intent at TH_SYN yields hard synth_mass", () => {
    const { TH_SYN } = MASTERMIND_TIER_THRESHOLDS;
    const r = computeMastermindTier({
      ...BASE(),
      toolDataEstTokens: TH_SYN,
    });
    assert.equal(r.tier, "hard");
    assert.ok(r.reasons.includes("synth_mass"));
  });

  it("DUMP threshold yields hard regardless of intent band", () => {
    const { TH_DUMP } = MASTERMIND_TIER_THRESHOLDS;
    const r = computeMastermindTier({
      intent: "no_data",
      depth: 1,
      lastUserContent: "hi",
      toolDataEstTokens: TH_DUMP,
    });
    assert.equal(r.tier, "hard");
    assert.deepEqual(r.reasons, ["dump"]);
  });

  it("depth >= D_HARD_TH yields hard", () => {
    const { D_HARD_TH } = MASTERMIND_TIER_THRESHOLDS;
    const r = computeMastermindTier({
      ...BASE(),
      depth: D_HARD_TH,
      toolDataEstTokens: 500,
    });
    assert.equal(r.tier, "hard");
    assert.deepEqual(r.reasons, ["depth"]);
  });

  it("MED med_drill gate", () => {
    const { TH_MED, D_MED_TH } = MASTERMIND_TIER_THRESHOLDS;
    const r = computeMastermindTier({
      intent: "general",
      depth: D_MED_TH,
      lastUserContent: "explain my doubts",
      toolDataEstTokens: TH_MED,
    });
    assert.equal(r.tier, "hard");
    assert.ok(r.reasons.includes("med_drill"));
  });

  it("sparse prep payload yields easy early", () => {
    const { TH_SPARSE } = MASTERMIND_TIER_THRESHOLDS;
    const r = computeMastermindTier({
      ...BASE(),
      toolDataEstTokens: TH_SPARSE,
    });
    assert.equal(r.tier, "easy");
    assert.deepEqual(r.reasons, ["sparse"]);
  });

  it("MASTERMIND_FORCE_MODEL_TIER=easy", () => {
    process.env.MASTERMIND_FORCE_MODEL_TIER = "easy";
    const r = computeMastermindTier({
      ...BASE(),
      toolDataEstTokens: 9000,
    });
    assert.equal(r.tier, "easy");
    assert.deepEqual(r.reasons, ["forced"]);
  });
});
