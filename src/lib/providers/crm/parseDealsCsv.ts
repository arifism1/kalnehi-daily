/**
 * Pure CSV -> Deal[] parser for the read-only CRM import path (PROVIDER_CRM = csv).
 *
 * Tolerant of header order and quoted fields; reports per-row errors instead of
 * throwing, so an admin importing a messy export gets actionable feedback and the
 * good rows still load. No DB / network — pure and unit-tested.
 *
 * Expected headers (case-insensitive): externalId, name, amount, currency, stage,
 * ownerExternalId?, lostReason?, createdAt?, closedAt?
 */
import type { Deal, DealStage } from "@engine/providers/crm";

const VALID_STAGES: readonly DealStage[] = [
  "lead",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

export interface ParseDealsResult {
  deals: Deal[];
  errors: string[];
}

/** Minimal RFC-4180-ish line splitter supporting quoted fields with commas. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out.map((f) => f.trim());
}

function normalizeStage(raw: string): DealStage | null {
  const s = raw.trim().toLowerCase().replace(/[\s_-]+/g, "");
  const map: Record<string, DealStage> = {
    lead: "lead",
    new: "lead",
    qualified: "qualified",
    proposal: "proposal",
    quote: "proposal",
    negotiation: "negotiation",
    negotiating: "negotiation",
    won: "won",
    closedwon: "won",
    lost: "lost",
    closedlost: "lost",
  };
  return map[s] ?? null;
}

export function parseDealsCsv(text: string): ParseDealsResult {
  const errors: string[] = [];
  const deals: Deal[] = [];

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { deals, errors: ["Empty CSV"] };
  }

  const header = splitCsvLine(lines[0]!).map((h) => h.toLowerCase());
  const col = (name: string) => header.indexOf(name.toLowerCase());

  const idx = {
    externalId: col("externalId"),
    name: col("name"),
    amount: col("amount"),
    currency: col("currency"),
    stage: col("stage"),
    ownerExternalId: col("ownerExternalId"),
    lostReason: col("lostReason"),
    createdAt: col("createdAt"),
    closedAt: col("closedAt"),
  };

  for (const required of ["externalId", "name", "amount", "stage"] as const) {
    if (idx[required] < 0) {
      errors.push(`Missing required column: ${required}`);
    }
  }
  if (errors.length > 0) return { deals, errors };

  for (let r = 1; r < lines.length; r++) {
    const cells = splitCsvLine(lines[r]!);
    const get = (i: number) => (i >= 0 && i < cells.length ? cells[i]! : "");

    const externalId = get(idx.externalId);
    const name = get(idx.name);
    const amountRaw = get(idx.amount).replace(/[, ]/g, "");
    const amount = Number(amountRaw);
    const stage = normalizeStage(get(idx.stage));

    if (!externalId) {
      errors.push(`Row ${r + 1}: missing externalId`);
      continue;
    }
    if (!Number.isFinite(amount)) {
      errors.push(`Row ${r + 1}: invalid amount "${get(idx.amount)}"`);
      continue;
    }
    if (!stage) {
      errors.push(`Row ${r + 1}: unknown stage "${get(idx.stage)}"`);
      continue;
    }

    deals.push({
      externalId,
      name: name || externalId,
      amount,
      currency: get(idx.currency) || "INR",
      stage,
      ownerExternalId: get(idx.ownerExternalId) || undefined,
      lostReason: get(idx.lostReason) || undefined,
      createdAt: get(idx.createdAt) || undefined,
      closedAt: get(idx.closedAt) || undefined,
    });
  }

  return { deals, errors };
}
