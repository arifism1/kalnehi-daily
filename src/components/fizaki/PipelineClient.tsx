"use client";

/**
 * Rep pipeline. Manual deal entry now (voice + CRM sync land behind PROVIDER_CRM later).
 * Operates on local state seeded from demo data so it runs without a database.
 */
import { useMemo, useState } from "react";

import type { Deal, DealStage } from "@engine/providers/crm";
import { DEMO_CURRENCY, DEMO_DEALS, formatCurrency } from "@/lib/fizaki/demoData";

const STAGES: DealStage[] = [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

const OPEN_STAGES: DealStage[] = ["lead", "qualified", "proposal", "negotiation"];

export function PipelineClient() {
  const [deals, setDeals] = useState<Deal[]>(DEMO_DEALS);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [stage, setStage] = useState<DealStage>("lead");

  const openTotal = useMemo(
    () =>
      deals
        .filter((d) => OPEN_STAGES.includes(d.stage))
        .reduce((s, d) => s + d.amount, 0),
    [deals],
  );

  function addDeal() {
    const value = Number(amount.replace(/[, ]/g, ""));
    if (!name.trim() || !Number.isFinite(value) || value <= 0) return;
    setDeals((prev) => [
      {
        externalId: `M-${Date.now()}`,
        name: name.trim(),
        amount: value,
        currency: DEMO_CURRENCY,
        stage,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setName("");
    setAmount("");
    setStage("lead");
  }

  return (
    <section className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold tracking-tight text-kal-text">Pipeline</h1>
      <p className="mt-1 text-sm text-kal-text-secondary">
        Open pipeline:{" "}
        <span className="font-semibold text-kal-text">
          {formatCurrency(openTotal)}
        </span>
      </p>

      <div className="mt-4 rounded-xl border border-kal-border bg-kal-card p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-kal-muted">
          Add a deal
        </p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Account / deal name"
          className="mt-2 w-full rounded-lg border border-kal-border bg-kal-page px-3 py-2 text-sm text-kal-text outline-none focus:border-kal-accent"
          aria-label="Deal name"
        />
        <div className="mt-2 flex gap-2">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="numeric"
            placeholder="Amount"
            className="w-1/2 rounded-lg border border-kal-border bg-kal-page px-3 py-2 text-sm text-kal-text outline-none focus:border-kal-accent"
            aria-label="Deal amount"
          />
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value as DealStage)}
            className="w-1/2 rounded-lg border border-kal-border bg-kal-page px-3 py-2 text-sm capitalize text-kal-text outline-none focus:border-kal-accent"
            aria-label="Deal stage"
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={addDeal}
          className="mt-3 w-full rounded-lg bg-kal-accent px-4 py-2.5 text-sm font-semibold text-kal-accent-foreground transition-colors hover:bg-kal-accent-hover"
        >
          Add deal
        </button>
      </div>

      <ul className="mt-4 space-y-2">
        {deals.map((d) => (
          <li
            key={d.externalId}
            className="flex items-center justify-between rounded-xl border border-kal-border bg-kal-card px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-kal-text">{d.name}</p>
              <p className="text-xs capitalize text-kal-muted">
                {d.stage}
                {d.lostReason ? ` · ${d.lostReason}` : ""}
              </p>
            </div>
            <span className="ml-3 shrink-0 text-sm font-semibold text-kal-text">
              {formatCurrency(d.amount, d.currency)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
