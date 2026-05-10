import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatMarksIntelligenceMarkdown,
  formatSyllabusOverviewMarkdown,
  formatWeakStrongMarkdown,
} from "@/lib/prepBrainDataSerializer";
import type { MarksIntelligenceRow } from "@/lib/prepbrainToolQueries";
import {
  resolveExamNamesToLoadFromProfile,
  resolvePrepbrainExamLabels,
} from "@/lib/syllabusDataForUser";

describe("resolveExamNamesToLoadFromProfile", () => {
  it("prefers enabled_exams_in_track order when set", () => {
    const r = resolveExamNamesToLoadFromProfile({
      selected_track: "medical_pg",
      primary_exam: "NEET PG",
      target_exam: "NEET PG",
      enabled_exams_in_track: ["NEET PG", "INI-CET"],
    });
    assert.deepEqual(r, ["NEET PG", "INI-CET"]);
  });

  it("uses full track examNames when enabled list empty but track resolves", () => {
    const r = resolveExamNamesToLoadFromProfile({
      selected_track: "medical_pg",
      primary_exam: "NEET PG",
      target_exam: "NEET PG",
      enabled_exams_in_track: [],
    });
    assert.deepEqual(r, ["INI-CET", "NEET PG"]);
  });

  it("returns null for legacy profile not belonging to any track", () => {
    const r = resolveExamNamesToLoadFromProfile({
      selected_track: null,
      primary_exam: "Other",
      target_exam: null,
      enabled_exams_in_track: null,
    });
    assert.equal(r, null);
  });
});

describe("resolvePrepbrainExamLabels", () => {
  it("falls back to target/primary when multi-track list is null", () => {
    const r = resolvePrepbrainExamLabels({
      selected_track: null,
      primary_exam: "Other",
      target_exam: null,
      enabled_exams_in_track: null,
    });
    assert.deepEqual(r, ["Other"]);
  });
});

describe("prepBrain serializers — multi-exam payloads", () => {
  it("formatSyllabusOverviewMarkdown lists each exam", () => {
    const md = formatSyllabusOverviewMarkdown({
      exams: [
        { exam: "NEET PG", overall_completion_percent: 10, subjects_covered: 4 },
        { exam: "INI-CET", overall_completion_percent: 5, subjects_covered: 3 },
      ],
    });
    assert.ok(md.includes("### Syllabus snapshot"));
    assert.ok(md.includes("NEET PG"));
    assert.ok(md.includes("INI-CET"));
    assert.ok(md.includes("**4**"));
    assert.ok(md.includes("**3**"));
  });

  it("formatWeakStrongMarkdown groups by exam", () => {
    const md = formatWeakStrongMarkdown({
      exams: [
        {
          exam: "NEET PG",
          weak_top_3: [
            { subject: "Physiology", completion_percent: 5, topics_remaining: 8 },
          ],
          strong_top_3: [
            { subject: "Anatomy", completion_percent: 40, topics_remaining: 2 },
          ],
        },
      ],
    });
    assert.ok(md.includes("NEET PG"));
    assert.ok(md.includes("Physiology"));
  });

  it("formatMarksIntelligenceMarkdown renders each exam block", () => {
    const row: MarksIntelligenceRow = {
      subject: "Physics",
      chapter: "Mechanics",
      marks_2023: 10,
      marks_2024: 10,
      marks_2025: 10,
      marks_2026: 10,
      total_topics: 10,
      done_topics: 2,
      completion_pct: 20,
    };
    const md = formatMarksIntelligenceMarkdown({
      exams: [
        { exam: "NEET PG", marks_rows: [row] },
        { exam: "INI-CET", marks_rows: [] },
      ],
    });
    assert.ok(md.includes("Marks intelligence (NEET PG)"));
    assert.ok(md.includes("Marks intelligence (INI-CET)"));
    assert.ok(md.includes("Mechanics"));
  });
});
