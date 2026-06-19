import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Deal } from "@engine/providers/crm";

import {
  playbookToNodes,
  structurePlaybook,
} from "./playbookStructurer";
import { computeRampMetrics } from "./rampMetrics";
import { planQuotaGap } from "./quotaGapPlanner";

describe("structurePlaybook", () => {
  it("structures markdown headings + bullets into modules → skills → micro-skills", () => {
    const text = `# Discovery
- Ask qualifying questions
  - Budget
  - Authority
- Map the buying committee

## Objection Handling
### Pricing objections
- Anchor on ROI`;
    const { modules } = structurePlaybook(text);
    assert.equal(modules.length, 2);
    assert.equal(modules[0]!.title, "Discovery");
    assert.equal(modules[0]!.skills.length, 2);
    assert.deepEqual(modules[0]!.skills[0]!.microSkills, ["Budget", "Authority"]);
    assert.equal(modules[1]!.title, "Objection Handling");
    // ### becomes a skill under its module.
    assert.equal(modules[1]!.skills[0]!.title, "Pricing objections");
    assert.deepEqual(modules[1]!.skills[1]!.microSkills, []);
  });

  it("falls back to a default module when there are no headings", () => {
    const { modules } = structurePlaybook("- First skill\n- Second skill");
    assert.equal(modules.length, 1);
    assert.equal(modules[0]!.title, "General");
    assert.equal(modules[0]!.skills.length, 2);
  });

  it("recognizes numbered and ALL-CAPS module headers", () => {
    const { modules } = structurePlaybook("1. Prospecting\n- Cold call\nCOMPLIANCE\n- Disclosures");
    assert.equal(modules.length, 2);
    assert.equal(modules[0]!.title, "Prospecting");
    assert.equal(modules[1]!.title, "COMPLIANCE");
  });
});

describe("playbookToNodes", () => {
  it("flattens with deterministic parent keys and sensible weights", () => {
    const structured = structurePlaybook(`# M1
- S1
  - micro-a
  - micro-b
- S2`);
    const nodes = playbookToNodes(structured);
    const module = nodes.find((n) => n.kind === "module")!;
    assert.equal(module.parentKey, null);
    assert.equal(module.key, "0");
    // module weight = Σ max(1, microcount) over skills = 2 (S1) + 1 (S2) = 3
    assert.equal(module.weight, 3);

    const s1 = nodes.find((n) => n.key === "0.0")!;
    assert.equal(s1.kind, "skill");
    assert.equal(s1.parentKey, "0");
    assert.equal(s1.weight, 2);

    const micro = nodes.find((n) => n.key === "0.0.1")!;
    assert.equal(micro.kind, "micro");
    assert.equal(micro.parentKey, "0.0");
    assert.equal(micro.label, "micro-b");
  });
});

function deal(partial: Partial<Deal> & { externalId: string }): Deal {
  return {
    name: partial.name ?? partial.externalId,
    amount: partial.amount ?? 0,
    currency: "INR",
    stage: partial.stage ?? "lead",
    ...partial,
  };
}

describe("computeRampMetrics", () => {
  const deals: Deal[] = [
    deal({ externalId: "D1", amount: 300000, stage: "won", closedAt: "2026-02-10" }),
    deal({ externalId: "D2", amount: 400000, stage: "won", closedAt: "2026-03-01" }),
    deal({ externalId: "D3", amount: 500000, stage: "negotiation" }),
    deal({ externalId: "D4", amount: 200000, stage: "lost", closedAt: "2026-02-15" }),
  ];

  it("computes days-to-first-deal, attainment, and open pipeline", () => {
    const m = computeRampMetrics({
      deals,
      repStartDate: "2026-01-01",
      quota: 1000000,
      asOf: "2026-03-15",
    });
    assert.equal(m.wonCount, 2);
    assert.equal(m.wonAmount, 700000);
    assert.equal(m.attainmentPct, 70);
    assert.equal(m.openPipelineAmount, 500000); // lost excluded
    assert.equal(m.daysToFirstDeal, 40); // Jan 1 -> Feb 10
    assert.equal(m.daysToFullProductivity, null); // 70% never hits 100%
  });

  it("reports full productivity once cumulative won hits the threshold", () => {
    const m = computeRampMetrics({
      deals,
      repStartDate: "2026-01-01",
      quota: 600000,
      asOf: "2026-03-15",
    });
    // cumulative 300k (Feb 10) < 600k, then 700k (Mar 1) >= 600k
    assert.equal(m.daysToFullProductivity, 59); // Jan 1 -> Mar 1
  });

  it("is safe when quota is zero", () => {
    const m = computeRampMetrics({ deals, repStartDate: "2026-01-01", quota: 0 });
    assert.equal(m.attainmentPct, 0);
    assert.equal(m.daysToFullProductivity, null);
  });
});

describe("planQuotaGap", () => {
  it("prioritizes weak high-impact skills and biggest open deals", () => {
    const plan = planQuotaGap({
      skills: [
        { id: "s1", label: "Pricing objections", impact: 10, masteryPercent: 20 },
        { id: "s2", label: "Discovery", impact: 8, masteryPercent: 90 },
        { id: "s3", label: "Closing", impact: 6, masteryPercent: 100 },
      ],
      deals: [
        deal({ externalId: "D1", name: "Acme", amount: 500000, stage: "negotiation" }),
        deal({ externalId: "D2", name: "Globex", amount: 800000, stage: "proposal" }),
        deal({ externalId: "D3", name: "Won Co", amount: 999999, stage: "won" }),
      ],
      quota: 1000000,
      wonAmount: 600000,
    });

    assert.equal(plan.quotaGap, 400000);
    // s3 is at 100% mastery → excluded; s1 (impact 10) ranks above s2.
    assert.deepEqual(
      plan.skillPriorities.map((s) => s.id),
      ["s1", "s2"],
    );
    // Won deal excluded; Globex (800k) ranks above Acme (500k).
    assert.deepEqual(
      plan.accountsToActOn.map((a) => a.externalId),
      ["D2", "D1"],
    );
    assert.ok(plan.projectedReadinessPct >= 0 && plan.projectedReadinessPct <= 100);
  });
});
