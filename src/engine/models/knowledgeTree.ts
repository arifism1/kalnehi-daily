/**
 * ENGINE model: KnowledgeTree — nested masterable units (domain-agnostic).
 *
 * Kalnehi: Syllabus -> Chapter -> Microtopic. FIZAKI: Playbook -> Module -> Skill.
 * The engine sees only generic branches/leaves with a weight (outcome contribution) and
 * a mastery status. Each vertical provides a `KnowledgeTreeRepository` adapter that maps
 * its own storage (Kalnehi -> syllabus_master; FIZAKI -> knowledge_nodes) onto this shape.
 *
 * This is the explicit two-backend boundary from REFRACTOR_PLAN.md section 4: "one engine
 * API, two adapters" — never a hidden divergent implementation behind one type.
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
  /** Top grouping (Kalnehi subject / FIZAKI competency area). */
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
 * Per-vertical adapter. `Scope` is the vertical's own selector (Kalnehi: exam + user;
 * FIZAKI: org playbook + rep). The engine depends only on this interface.
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
