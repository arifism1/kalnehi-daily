/**
 * Playbook import → KnowledgeTree structuring (FIZAKI admin surface).
 *
 * Pure, heuristic parser that turns a pasted/uploaded sales playbook into a 3-level
 * structure: Module → Skill → Micro-skill. Markdown-aware (headings + bullets) with a
 * graceful fallback so a plain bullet list still imports. An LLM pass can refine this
 * later behind LlmProvider, but the deterministic structurer keeps import working offline
 * and is unit-testable.
 *
 * Output maps directly onto the knowledge_nodes table (kind: module|skill|micro).
 */

export interface StructuredSkill {
  title: string;
  microSkills: string[];
}

export interface StructuredModule {
  title: string;
  skills: StructuredSkill[];
}

export interface StructuredPlaybook {
  modules: StructuredModule[];
}

export interface KnowledgeNodeSeed {
  /** Deterministic path key, e.g. "0", "0.1", "0.1.2" — used to wire parent_id on insert. */
  key: string;
  parentKey: string | null;
  kind: "module" | "skill" | "micro";
  label: string;
  position: number;
  weight: number;
}

type LineKind = "module" | "skill" | "micro" | "blank";

interface ParsedLine {
  kind: LineKind;
  text: string;
}

const DEFAULT_MODULE = "General";

function classifyLine(rawLine: string): ParsedLine {
  const line = rawLine.replace(/\t/g, "    ");
  const trimmed = line.trim();
  if (trimmed.length === 0) return { kind: "blank", text: "" };

  // Markdown headings: # / ## = module, ### (or deeper) = skill.
  const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
  if (heading) {
    const level = heading[1]!.length;
    const text = heading[2]!.trim();
    return { kind: level <= 2 ? "module" : "skill", text };
  }

  // Bullets: leading indentation decides skill vs micro-skill.
  const bullet = /^([-*+])\s+(.*)$/.exec(trimmed);
  if (bullet) {
    const indent = line.length - line.trimStart().length;
    return { kind: indent >= 2 ? "micro" : "skill", text: bullet[2]!.trim() };
  }

  // Numbered list "1." / "1)" → treat as a module header (common playbook outline).
  const numbered = /^\d+[.)]\s+(.*)$/.exec(trimmed);
  if (numbered) return { kind: "module", text: numbered[1]!.trim() };

  // ALL-CAPS standalone line → module header.
  if (trimmed.length <= 60 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
    return { kind: "module", text: trimmed };
  }

  // Plain prose line → a skill under the current module.
  return { kind: "skill", text: trimmed };
}

export function structurePlaybook(text: string): StructuredPlaybook {
  const modules: StructuredModule[] = [];
  let currentModule: StructuredModule | null = null;
  let currentSkill: StructuredSkill | null = null;

  const ensureModule = (): StructuredModule => {
    if (!currentModule) {
      currentModule = { title: DEFAULT_MODULE, skills: [] };
      modules.push(currentModule);
    }
    return currentModule;
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const { kind, text: content } = classifyLine(rawLine);
    if (kind === "blank" || content.length === 0) continue;

    if (kind === "module") {
      currentModule = { title: content, skills: [] };
      modules.push(currentModule);
      currentSkill = null;
    } else if (kind === "skill") {
      const mod = ensureModule();
      currentSkill = { title: content, microSkills: [] };
      mod.skills.push(currentSkill);
    } else {
      // micro-skill — attach to current skill, creating one if needed.
      const mod = ensureModule();
      if (!currentSkill) {
        currentSkill = { title: content, microSkills: [] };
        mod.skills.push(currentSkill);
      } else {
        currentSkill.microSkills.push(content);
      }
    }
  }

  return { modules };
}

/**
 * Flattens a structured playbook into knowledge_nodes seeds with deterministic keys so a
 * server action can insert modules first, then skills/micro-skills wired by parent key.
 * Weight defaults: modules carry the sum of child weights; leaves default to 1 so the
 * engine's OutcomeMetric/GapPlanner can rank them (admins can re-weight later).
 */
export function playbookToNodes(structured: StructuredPlaybook): KnowledgeNodeSeed[] {
  const nodes: KnowledgeNodeSeed[] = [];
  structured.modules.forEach((mod, mi) => {
    const moduleKey = String(mi);
    const moduleWeight = mod.skills.reduce(
      (s, sk) => s + Math.max(1, sk.microSkills.length),
      0,
    );
    nodes.push({
      key: moduleKey,
      parentKey: null,
      kind: "module",
      label: mod.title,
      position: mi,
      weight: Math.max(1, moduleWeight),
    });
    mod.skills.forEach((sk, si) => {
      const skillKey = `${moduleKey}.${si}`;
      nodes.push({
        key: skillKey,
        parentKey: moduleKey,
        kind: "skill",
        label: sk.title,
        position: si,
        weight: Math.max(1, sk.microSkills.length),
      });
      sk.microSkills.forEach((micro, mmi) => {
        nodes.push({
          key: `${skillKey}.${mmi}`,
          parentKey: skillKey,
          kind: "micro",
          label: micro,
          position: mmi,
          weight: 1,
        });
      });
    });
  });
  return nodes;
}
