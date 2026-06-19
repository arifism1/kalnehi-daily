import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CrmActivity, Deal } from "@engine/providers/crm";

import { CsvCrmProvider, ManualCrmProvider } from "./crmProviders";
import { parseDealsCsv } from "./parseDealsCsv";

const CSV = `externalId,name,amount,currency,stage,ownerExternalId,lostReason,closedAt
D1,Acme Renewal,"1,200000",INR,negotiation,rep-1,,
D2,Globex Expansion,500000,INR,Closed Won,rep-1,,2026-05-01
D3,Initech Pilot,250000,INR,closed_lost,rep-2,Price too high,2026-04-20
BAD,Missing Amount,notanumber,INR,lead,rep-2,,`;

describe("parseDealsCsv", () => {
  it("parses valid rows, normalizes stages, strips amount separators", () => {
    const { deals, errors } = parseDealsCsv(CSV);
    assert.equal(deals.length, 3);
    assert.equal(deals[0]!.amount, 1200000);
    assert.equal(deals[0]!.stage, "negotiation");
    assert.equal(deals[1]!.stage, "won");
    assert.equal(deals[2]!.stage, "lost");
    assert.equal(deals[2]!.lostReason, "Price too high");
    // The bad row is reported, not silently dropped or defaulted.
    assert.equal(errors.length, 1);
    assert.match(errors[0]!, /invalid amount/i);
  });

  it("reports missing required columns", () => {
    const { deals, errors } = parseDealsCsv("name,amount\nFoo,100");
    assert.equal(deals.length, 0);
    assert.ok(errors.some((e) => /externalId/.test(e)));
    assert.ok(errors.some((e) => /stage/.test(e)));
  });

  it("handles empty input", () => {
    assert.deepEqual(parseDealsCsv("").errors, ["Empty CSV"]);
  });
});

describe("CsvCrmProvider (read-only)", () => {
  it("is read-only and filters by owner", async () => {
    const { provider } = CsvCrmProvider.fromCsv(CSV);
    assert.equal(provider.canPushActivity, false);
    assert.equal(provider.source, "csv");
    const all = await provider.listDeals();
    assert.equal(all.length, 3);
    const rep1 = await provider.listDeals("rep-1");
    assert.equal(rep1.length, 2);
  });
});

describe("ManualCrmProvider (injected store)", () => {
  it("delegates reads/writes to its dependencies", async () => {
    const store: Deal[] = [
      {
        externalId: "M1",
        name: "Manual deal",
        amount: 1000,
        currency: "INR",
        stage: "qualified",
        ownerExternalId: "rep-9",
      },
    ];
    const activities: CrmActivity[] = [];
    const provider = new ManualCrmProvider({
      loadDeals: async (owner) =>
        owner ? store.filter((d) => d.ownerExternalId === owner) : store,
      saveActivity: async (a) => {
        activities.push(a);
      },
    });

    assert.equal(provider.canPushActivity, true);
    assert.equal((await provider.listDeals("rep-9")).length, 1);
    await provider.pushActivity({
      dealExternalId: "M1",
      type: "call",
      occurredAt: "2026-06-19T10:00:00Z",
    });
    assert.equal(activities.length, 1);
    assert.equal(activities[0]!.type, "call");
  });
});
