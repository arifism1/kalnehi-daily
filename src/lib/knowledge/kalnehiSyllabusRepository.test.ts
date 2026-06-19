import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SyllabusRow } from "@/lib/syllabusGrouping";

import { buildKalnehiKnowledgeTree } from "./kalnehiSyllabusRepository";

function row(
  id: string,
  subject: string,
  chapter: string,
  marks: number,
  micro: string,
): SyllabusRow {
  return {
    id,
    subject,
    chapter,
    microtopic: micro,
    marks_2026: marks,
  } as unknown as SyllabusRow;
}

describe("buildKalnehiKnowledgeTree (Kalnehi -> engine KnowledgeTree)", () => {
  const rows = [
    row("p1", "Physics", "Kinematics", 8, "Speed"),
    row("p2", "Physics", "Kinematics", 8, "Acceleration"),
    row("b1", "Biology", "Genetics", 20, "Mendel"),
  ];
  const status = { p1: "completed", p2: "not_begun", b1: "completed" };

  it("groups microtopics into chapter branches with subject groups", () => {
    const tree = buildKalnehiKnowledgeTree({
      rows,
      statusBySyllabusMasterId: status,
      primaryMarksYear: 2026,
    });
    assert.equal(tree.branches.length, 2);

    const physics = tree.branches.find((b) => b.label === "Kinematics")!;
    assert.equal(physics.group, "Physics");
    // Equal weights on duplicated chapter rows collapse to the single chapter weight.
    assert.equal(physics.weight, 8);
    assert.equal(physics.leaves.length, 2);
    assert.equal(physics.leaves[0]!.status, "completed");
    assert.equal(physics.leaves[1]!.status, "not_begun");

    const bio = tree.branches.find((b) => b.label === "Genetics")!;
    assert.equal(bio.weight, 20);
    assert.equal(bio.leaves[0]!.status, "completed");
  });

  it("normalizes unknown statuses to not_begun", () => {
    const tree = buildKalnehiKnowledgeTree({
      rows: [row("x1", "Chem", "Mole", 5, "Avogadro")],
      statusBySyllabusMasterId: { x1: "garbage-status" },
    });
    assert.equal(tree.branches[0]!.leaves[0]!.status, "not_begun");
  });

  it("handles empty input", () => {
    const tree = buildKalnehiKnowledgeTree({ rows: [], statusBySyllabusMasterId: {} });
    assert.deepEqual(tree.branches, []);
  });
});
