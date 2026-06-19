/**
 * In-memory demo data for the FIZAKI buyer-core surfaces.
 *
 * Lets the full rep loop + manager dashboard run and demo WITHOUT a live database
 * (Supabase branching needs Pro; this is the plan-around). The Supabase-backed
 * repositories are a drop-in adapter later — these shapes mirror the migration tables
 * (deals, knowledge_nodes) so swapping persistence in is mechanical.
 */
import type { Deal } from "@engine/providers/crm";

import type { PlaybookSkill } from "./quotaGapPlanner";

export const DEMO_REP_START_DATE = "2026-04-01";
export const DEMO_QUOTA = 1_500_000;
export const DEMO_CURRENCY = "INR";

export const DEMO_PLAYBOOK = `# Discovery
- Run a structured discovery call
  - Identify the economic buyer
  - Quantify the cost of inaction
- Map the buying committee

# Objection Handling
### Pricing objections
- Anchor on ROI, not list price
- Trade concessions, never give them
### Competitor objections
- Lead with differentiated outcomes

# Closing
- Mutual action plan
- Create urgency with a compelling event`;

export const DEMO_DEALS: Deal[] = [
  {
    externalId: "D-1001",
    name: "Acme Corp — Platform",
    amount: 450_000,
    currency: DEMO_CURRENCY,
    stage: "won",
    closedAt: "2026-05-12",
    createdAt: "2026-04-05",
  },
  {
    externalId: "D-1002",
    name: "Globex — Expansion",
    amount: 600_000,
    currency: DEMO_CURRENCY,
    stage: "negotiation",
    createdAt: "2026-04-20",
  },
  {
    externalId: "D-1003",
    name: "Initech — New Logo",
    amount: 800_000,
    currency: DEMO_CURRENCY,
    stage: "proposal",
    createdAt: "2026-05-01",
  },
  {
    externalId: "D-1004",
    name: "Umbrella — Pilot",
    amount: 250_000,
    currency: DEMO_CURRENCY,
    stage: "qualified",
    createdAt: "2026-05-18",
  },
  {
    externalId: "D-1005",
    name: "Soylent — Renewal",
    amount: 300_000,
    currency: DEMO_CURRENCY,
    stage: "lost",
    closedAt: "2026-05-09",
    lostReason: "Price too high",
    createdAt: "2026-04-10",
  },
];

/** Mastery comes from playbook practice progress; impact is the admin-set revenue weight. */
export const DEMO_SKILLS: PlaybookSkill[] = [
  { id: "sk-pricing", label: "Pricing objections", impact: 10, masteryPercent: 25 },
  { id: "sk-discovery", label: "Structured discovery", impact: 9, masteryPercent: 70 },
  { id: "sk-competitor", label: "Competitor objections", impact: 7, masteryPercent: 40 },
  { id: "sk-closing", label: "Mutual action plan", impact: 8, masteryPercent: 55 },
  { id: "sk-committee", label: "Map buying committee", impact: 5, masteryPercent: 90 },
];

export function formatCurrency(amount: number, currency = DEMO_CURRENCY): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString("en-IN")}`;
  }
}
