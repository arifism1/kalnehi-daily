/**
 * Concrete CRM providers for FIZAKI pilots. Dependency-injected over their data
 * source so they don't hard-depend on the `deals` table (added in a later migration):
 * pass a loader/writer at construction and the same code works for in-memory tests,
 * Supabase-backed manual entry, or a parsed CSV import.
 */
import type {
  CrmActivity,
  CrmProvider,
  Deal,
} from "@engine/providers/crm";

import { parseDealsCsv, type ParseDealsResult } from "./parseDealsCsv";

/** Read-only provider backed by an in-memory list parsed from a CSV export. */
export class CsvCrmProvider implements CrmProvider {
  readonly source = "csv" as const;
  readonly canPushActivity = false;
  private readonly deals: Deal[];

  constructor(deals: Deal[]) {
    this.deals = deals;
  }

  static fromCsv(text: string): { provider: CsvCrmProvider; parse: ParseDealsResult } {
    const parse = parseDealsCsv(text);
    return { provider: new CsvCrmProvider(parse.deals), parse };
  }

  async listDeals(ownerExternalId?: string): Promise<Deal[]> {
    if (!ownerExternalId) return [...this.deals];
    return this.deals.filter((d) => d.ownerExternalId === ownerExternalId);
  }
}

/** Manual entry (+ voice) provider; reads/writes via injected callbacks. */
export class ManualCrmProvider implements CrmProvider {
  readonly source = "manual" as const;
  readonly canPushActivity = true;

  constructor(
    private readonly deps: {
      loadDeals: (ownerExternalId?: string) => Promise<Deal[]>;
      saveActivity: (activity: CrmActivity) => Promise<void>;
    },
  ) {}

  listDeals(ownerExternalId?: string): Promise<Deal[]> {
    return this.deps.loadDeals(ownerExternalId);
  }

  pushActivity(activity: CrmActivity): Promise<void> {
    return this.deps.saveActivity(activity);
  }
}
