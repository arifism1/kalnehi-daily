import type { Microtopic, Task } from "@/store/useTaskStore";

/** Syllabus row for a task, or an empty placeholder for free-text-only tasks. */
export function resolveMicrotopicForTask(
  t: Task,
  syllabusById: Record<string, Microtopic>,
): Microtopic {
  if (t.microtopic_id && syllabusById[t.microtopic_id]) {
    return syllabusById[t.microtopic_id];
  }
  return {
    id: "",
    exam_name: "",
    subject: "",
    chapter: "",
    microtopic: "",
    created_at: null,
    marks_2023: null,
    marks_2024: null,
    marks_2025: null,
    relative_effort_score: null,
    section: null,
    weightage_tag: null,
  };
}
