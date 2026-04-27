import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeSyllabusRollup } from "./syllabusRollup";
import type { SyllabusRow } from "./syllabusGrouping";

/**
 * Minimal syllabus_master-shaped row: rollup only needs id, subject, chapter, marks_20xx.
 * Two "exams" reusing the same display subject+chapter (e.g. JEE Main + JEE Advanced)
 * must be rolled up per exam, not as one concatenated list.
 */
function row(
  id: string,
  subj: string,
  ch: string,
  marks: number,
): SyllabusRow {
  return {
    id,
    subject: subj,
    chapter: ch,
    microtopic: `micro-${id}`,
    marks_2025: marks,
    marks_2024: marks,
    marks_2023: marks,
  } as SyllabusRow;
}

describe("computeSyllabusRollup (multi-exam / duplicate chapter keys)", () => {
  it("differs from merging two exam syllabi into one combined rollup", () => {
    const year = 2025;
    // Exam A: one chapter, two equal-weight microtopic rows (pool = 10, all-or-nothing).
    const examA = [
      row("a1", "Physics", "Kinematics", 10),
      row("a2", "Physics", "Kinematics", 10),
    ];
    // Exam B: same subject+chapter names, two rows, only "b1" completed in status map.
    const examB = [
      row("b1", "Physics", "Kinematics", 10),
      row("b2", "Physics", "Kinematics", 10),
    ];
    const merged = [...examA, ...examB];

    const allDone: Record<string, string> = {
      a1: "completed",
      a2: "completed",
      b1: "completed",
      b2: "completed",
    };
    const oneIncomplete: Record<string, string> = {
      a1: "completed",
      a2: "completed",
      b1: "completed",
      b2: "not_begun",
    };

    const rA = computeSyllabusRollup(examA, allDone, year);
    const rB = computeSyllabusRollup(examB, oneIncomplete, year);
    const rMerged = computeSyllabusRollup(merged, oneIncomplete, year);

    // Per-exam: A fully mastered, B not (incomplete microtopic in B).
    assert.equal(rA.totalMarksMastered, 10);
    assert.equal(rA.chapters[0]!.isChapterMastered, true);
    assert.equal(rB.totalMarksMastered, 0);
    assert.equal(rB.chapters[0]!.isChapterMastered, false);

    // Combined rollup collapses to one "Physics / Kinematics" bucket: 4 microtopics, 1 incomplete → 0 marks.
    assert.equal(rMerged.chapters[0]!.totalCount, 4);
    assert.equal(rMerged.chapters[0]!.isChapterMastered, false);
    assert.equal(
      rMerged.totalMarksMastered,
      0,
      "merged list inflates microtopic count; one incomplete blocks the whole bucket",
    );
    // Per-exam: 10+0 marks mastered, but merged shows 0 because the four rows share one chapter key.
    assert.equal(rA.totalMarksMastered + rB.totalMarksMastered, 10);
  });
});
