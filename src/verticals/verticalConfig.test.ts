import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveVertical,
  resolveVerticalFromHost,
} from "@/lib/vertical/resolveVertical";

import { fizakiConfig } from "./fizaki.config";
import { kalnehiConfig } from "./kalnehi.config";
import { VERTICALS, copy, isFeatureEnabled } from "./index";
import type { CopyPack } from "./types";

describe("resolveVerticalFromHost", () => {
  it("matches kalnehi domains (www, apex, with port)", () => {
    assert.equal(resolveVerticalFromHost("www.kalnehi.com"), "kalnehi");
    assert.equal(resolveVerticalFromHost("kalnehi.com"), "kalnehi");
    assert.equal(resolveVerticalFromHost("www.kalnehi.com:443"), "kalnehi");
    assert.equal(resolveVerticalFromHost("WWW.KALNEHI.COM"), "kalnehi");
  });

  it("matches fizaki domains", () => {
    assert.equal(resolveVerticalFromHost("www.fizaki.in"), "fizaki");
    assert.equal(resolveVerticalFromHost("fizaki.in"), "fizaki");
  });

  it("returns null for unknown hosts (preview / localhost / empty)", () => {
    assert.equal(resolveVerticalFromHost("my-app-abc123.vercel.app"), null);
    assert.equal(resolveVerticalFromHost("localhost"), null);
    assert.equal(resolveVerticalFromHost(""), null);
    assert.equal(resolveVerticalFromHost(null), null);
    assert.equal(resolveVerticalFromHost(undefined), null);
  });

  it("does not match look-alike / spoofed hosts", () => {
    assert.equal(resolveVerticalFromHost("kalnehi.com.evil.com"), null);
    assert.equal(resolveVerticalFromHost("notkalnehi.com"), null);
  });
});

describe("resolveVertical (host wins, never throws)", () => {
  it("host takes precedence and always returns a valid id", () => {
    assert.equal(resolveVertical("www.fizaki.in"), "fizaki");
    assert.equal(resolveVertical("www.kalnehi.com"), "kalnehi");
    // Unknown host falls back to env or default — must still be a known id.
    const fallback = resolveVertical("preview.vercel.app");
    assert.ok(fallback === "kalnehi" || fallback === "fizaki");
  });
});

describe("CopyPack completeness", () => {
  const keys: (keyof CopyPack)[] = [
    "audienceNoun",
    "audienceNounPlural",
    "knowledgeTreeLabel",
    "knowledgeBranchLabel",
    "knowledgeLeafLabel",
    "knowledgeLeafLabelPlural",
    "outcomeMetricLabel",
    "outcomeUnit",
    "projectedOutcomeLabel",
    "gapPlannerLabel",
    "dailyPlanLabel",
    "revisionLabel",
    "assessmentLabel",
    "mistakeLogLabel",
    "queryTrackerLabel",
    "coachName",
    "debriefLabel",
  ];

  for (const [id, config] of Object.entries(VERTICALS)) {
    it(`${id} has every copy key, non-empty`, () => {
      for (const k of keys) {
        const v = copy(config, k);
        assert.equal(typeof v, "string", `${id}.${k} must be a string`);
        assert.ok(v.trim().length > 0, `${id}.${k} must be non-empty`);
      }
    });
  }
});

describe("no cross-vertical wording leakage", () => {
  const SALES_WORDS = ["quota", "playbook", "deal", "pitch", "objection", "crm"];
  const STUDENT_WORDS = [
    "syllabus",
    "exam",
    "marks",
    "chapter",
    "microtopic",
    "rank",
    "student",
  ];

  function copyValues(c: CopyPack): string[] {
    return Object.values(c).map((v) => v.toLowerCase());
  }

  it("kalnehi copy contains NO sales wording", () => {
    for (const value of copyValues(kalnehiConfig.copy)) {
      for (const w of SALES_WORDS) {
        assert.ok(!value.includes(w), `kalnehi copy "${value}" leaks sales word "${w}"`);
      }
    }
  });

  it("fizaki copy contains NO student wording", () => {
    for (const value of copyValues(fizakiConfig.copy)) {
      for (const w of STUDENT_WORDS) {
        assert.ok(
          !value.includes(w),
          `fizaki copy "${value}" leaks student word "${w}"`,
        );
      }
    }
  });
});

describe("brand + feature invariants", () => {
  it("kalnehi brand mirrors the live constants (drift guard)", () => {
    // Mirror of src/lib/seo-metadata.ts + appRoutes (kept in sync intentionally).
    assert.equal(kalnehiConfig.brand.productName, "Kalnehi Daily");
    assert.equal(kalnehiConfig.brand.shortName, "Kalnehi");
    assert.equal(kalnehiConfig.brand.tagline, "Voice-first exam prep tracker");
    assert.equal(kalnehiConfig.brand.theme.primaryColor, "#FF7A00");
    assert.equal(kalnehiConfig.brand.theme.backgroundColor, "#FAF7F2");
    assert.equal(kalnehiConfig.defaultHomePath, "/syllabus");
  });

  it("fizaki uses a distinct brand + domain", () => {
    assert.notEqual(
      fizakiConfig.brand.theme.primaryColor,
      kalnehiConfig.brand.theme.primaryColor,
    );
    assert.equal(fizakiConfig.brand.domain, "www.fizaki.in");
    assert.equal(kalnehiConfig.brand.domain, "www.kalnehi.com");
  });

  it("Tier-2 FIZAKI surfaces are disabled until a pilot is signed", () => {
    assert.equal(isFeatureEnabled(fizakiConfig, "mock-test-tracker"), false);
    assert.equal(isFeatureEnabled(fizakiConfig, "study-squad"), false);
    assert.equal(isFeatureEnabled(fizakiConfig, "habit-maker"), false);
    // Tier-1 buyer core is on.
    assert.equal(isFeatureEnabled(fizakiConfig, "manager-dashboard"), true);
    assert.equal(isFeatureEnabled(fizakiConfig, "quota-gap-planner"), true);
  });
});
