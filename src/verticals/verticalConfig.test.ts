import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveVertical,
  resolveVerticalFromHost,
} from "@/lib/vertical/resolveVertical";

import { kalnehiConfig } from "./kalnehi.config";
import { VERTICALS, copy } from "./index";
import type { CopyPack } from "./types";

describe("resolveVerticalFromHost", () => {
  it("matches kalnehi domains (www, apex, with port)", () => {
    assert.equal(resolveVerticalFromHost("www.kalnehi.com"), "kalnehi");
    assert.equal(resolveVerticalFromHost("kalnehi.com"), "kalnehi");
    assert.equal(resolveVerticalFromHost("www.kalnehi.com:443"), "kalnehi");
    assert.equal(resolveVerticalFromHost("WWW.KALNEHI.COM"), "kalnehi");
  });

  it("does not match removed fizaki domains", () => {
    assert.equal(resolveVerticalFromHost("www.fizaki.in"), null);
    assert.equal(resolveVerticalFromHost("fizaki.in"), null);
    assert.equal(resolveVerticalFromHost("fizaki.local"), null);
  });

  it("matches local dev domains (.local / .test)", () => {
    assert.equal(resolveVerticalFromHost("kalnehi.local"), "kalnehi");
    assert.equal(resolveVerticalFromHost("www.kalnehi.local:3000"), "kalnehi");
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
  it("host takes precedence and always returns kalnehi for known hosts", () => {
    assert.equal(resolveVertical("www.kalnehi.com"), "kalnehi");
    assert.equal(resolveVertical("preview.vercel.app"), "kalnehi");
    assert.equal(resolveVertical("localhost:3000"), "kalnehi");
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

  it("kalnehi copy contains student wording (sanity check)", () => {
    const joined = copyValues(kalnehiConfig.copy).join(" ");
    assert.ok(joined.includes("student") || joined.includes("syllabus"));
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
    assert.equal(kalnehiConfig.brand.domain, "www.kalnehi.com");
  });
});
