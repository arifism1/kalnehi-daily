import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  averageProjectedOutOfMax,
  type NeetYearProjection,
} from "./syllabusRollup";

function projection(
  year: number,
  projectedOutOf720: number,
): NeetYearProjection {
  return {
    year,
    totalMarksPool: 100,
    totalMarksMastered: 50,
    projectedOutOf720,
    patternLabel: "",
    completionNote: "",
  };
}

describe("averageProjectedOutOfMax", () => {
  it("returns null for empty input", () => {
    assert.equal(averageProjectedOutOfMax([]), null);
  });

  it("returns the single projection value", () => {
    assert.equal(averageProjectedOutOfMax([projection(2025, 233)]), 233);
  });

  it("returns the arithmetic mean rounded", () => {
    assert.equal(
      averageProjectedOutOfMax([
        projection(2025, 100),
        projection(2024, 120),
        projection(2023, 110),
      ]),
      110,
    );
  });
});
