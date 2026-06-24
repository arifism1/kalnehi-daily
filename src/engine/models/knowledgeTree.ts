/**
 * ENGINE model: KnowledgeTree — nested masterable units (domain-agnostic).
 *
 * Kalnehi maps Syllabus -> Chapter -> Microtopic onto branches/leaves with a weight
 * (outcome contribution) and mastery status. Each vertical provides a
 * `KnowledgeTreeRepository` adapter that maps its storage onto this shape.
 */

export type MasteryStatus = "not_begun" | "in_progress" | "completed";

export interface KnowledgeLeaf {
  /** Stable id from the backing store (syllabus_master id / knowledge_node id). */
  id: string;
  label: string;
  status: MasteryStatus;
}

export interface KnowledgeBranch {
  /** Unique key within the tree (e.g. group + label). */
  key: string;
  /** Top grouping (e.g. Kalnehi subject). */
  group: string;
  label: string;
  /** Outcome weight contributed when the whole branch is mastered (all-or-nothing). */
  weight: number;
  leaves: KnowledgeLeaf[];
}

export interface KnowledgeTree {
  branches: KnowledgeBranch[];
}

/**
 * Per-vertical adapter. `Scope` is the vertical's own selector (Kalnehi: exam + user).
 * The engine depends only on this interface.
 */
export interface KnowledgeTreeRepository<Scope = unknown> {
  getTree(scope: Scope): Promise<KnowledgeTree>;
}

/** Normalizes arbitrary status strings to the engine's mastery enum. */
export function normalizeMasteryStatus(raw: string | null | undefined): MasteryStatus {
  if (raw === "completed") return "completed";
  if (raw === "in_progress") return "in_progress";
  return "not_begun";
}
