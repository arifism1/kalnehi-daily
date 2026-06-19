import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { allFizakiLandingCopyStrings } from "@/components/fizaki/landing/copy";

const STUDENT_WORDS = [
  "syllabus",
  "exam",
  "marks",
  "chapter",
  "microtopic",
  "rank",
  "student",
];

const REVENUE_WORDS = ["revenue", "quota", "ramp", "pipeline", "playbook", "deal"];

describe("FIZAKI landing copy leakage", () => {
  it("contains NO student/exam wording", () => {
    for (const value of allFizakiLandingCopyStrings()) {
      for (const w of STUDENT_WORDS) {
        assert.ok(
          !value.includes(w),
          `FIZAKI landing copy "${value}" leaks student word "${w}"`,
        );
      }
    }
  });

  it("includes revenue/readiness framing", () => {
    const joined = allFizakiLandingCopyStrings().join(" ");
    for (const w of REVENUE_WORDS) {
      assert.ok(joined.includes(w), `expected revenue framing word "${w}" in landing copy`);
    }
  });
});
