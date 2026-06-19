/**
 * ENGINE provider interface: CRM / pipeline (PROVIDER_CRM).
 *
 * For FIZAKI pilots there are TWO implementations (app layer):
 *   - manual: rep enters deals by hand + voice
 *   - csv: read-only import of an exported CRM deal list (so RampMetric / attainment
 *     run on real-ish data instead of perfect manual logging — review item #5)
 * Salesforce / HubSpot sync arrive later behind this SAME interface.
 *
 * Domain-agnostic: "deal" here is a generic pipeline item with an outcome value and
 * a stage; it carries no sales-only wording the engine would have to understand.
 */

export type DealStage =
  | "lead"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export interface Deal {
  /** Stable id from the source system, or generated for manual entries. */
  externalId: string;
  name: string;
  /** Monetary value of the deal (outcome contribution toward quota). */
  amount: number;
  currency: string;
  stage: DealStage;
  /** Owner rep's user id (resolved against the vertical's users). */
  ownerExternalId?: string;
  /** Reason captured when stage === "lost" (feeds MistakeLog / Coach). */
  lostReason?: string;
  /** ISO timestamps. */
  createdAt?: string;
  closedAt?: string;
}

export interface CrmActivity {
  dealExternalId: string;
  type: "call" | "email" | "meeting" | "note" | "practice";
  note?: string;
  occurredAt: string;
}

export interface CrmProvider {
  readonly source: "manual" | "csv" | "salesforce" | "hubspot";
  /** Whether activities can be written back. CSV/read-only sources return false. */
  readonly canPushActivity: boolean;
  listDeals(ownerExternalId?: string): Promise<Deal[]>;
  pushActivity?(activity: CrmActivity): Promise<void>;
}
