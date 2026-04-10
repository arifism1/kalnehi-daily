/**
 * Bonus AI credits: separate 30-day pools (FIFO consume by soonest expiry).
 * Serialized as JSON in `user_profiles.*_ledger` columns.
 */

export type BonusLedgerEntry = {
  amount: number;
  expires_at: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function parseBonusLedger(raw: unknown): BonusLedgerEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: BonusLedgerEntry[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const amount = Number(item.amount);
    const expiresAt = item.expires_at;
    if (!Number.isFinite(amount) || amount <= 0) continue;
    if (typeof expiresAt !== "string") continue;
    const t = new Date(expiresAt).getTime();
    if (Number.isNaN(t)) continue;
    out.push({ amount: Math.floor(amount), expires_at: expiresAt });
  }
  return out;
}

export function pruneExpiredBonusLedger(
  entries: BonusLedgerEntry[],
  now: Date,
): BonusLedgerEntry[] {
  const cutoff = now.getTime();
  return entries.filter((e) => {
    const t = new Date(e.expires_at).getTime();
    return !Number.isNaN(t) && t > cutoff && e.amount > 0;
  });
}

export function totalActiveBonus(
  entries: BonusLedgerEntry[],
  now: Date,
): number {
  return pruneExpiredBonusLedger(entries, now).reduce((s, e) => s + e.amount, 0);
}

/** Soonest expiry among pools that still have remaining amount. */
export function nextBonusExpiryIso(
  entries: BonusLedgerEntry[],
  now: Date,
): string | null {
  const active = pruneExpiredBonusLedger(entries, now).filter((e) => e.amount > 0);
  if (active.length === 0) return null;
  let min = active[0].expires_at;
  let minT = new Date(min).getTime();
  for (let i = 1; i < active.length; i++) {
    const t = new Date(active[i].expires_at).getTime();
    if (!Number.isNaN(t) && t < minT) {
      minT = t;
      min = active[i].expires_at;
    }
  }
  return min;
}

export function addBonusPool(
  entries: BonusLedgerEntry[],
  amount: number,
  expiresAt: Date,
  now: Date,
): BonusLedgerEntry[] {
  if (amount <= 0) return pruneExpiredBonusLedger(entries, now);
  const base = pruneExpiredBonusLedger(entries, now);
  return [...base, { amount: Math.floor(amount), expires_at: expiresAt.toISOString() }];
}

/**
 * Consume units from bonus pools (FIFO by expiry). Returns updated ledger and how much was taken.
 */
export function consumeFromBonusLedger(
  entries: BonusLedgerEntry[],
  consume: number,
  now: Date,
): { ledger: BonusLedgerEntry[]; taken: number } {
  if (consume <= 0) {
    return { ledger: pruneExpiredBonusLedger(entries, now), taken: 0 };
  }
  const sorted = [...pruneExpiredBonusLedger(entries, now)].sort(
    (a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime(),
  );
  let need = consume;
  const next: BonusLedgerEntry[] = [];
  for (const e of sorted) {
    if (need <= 0) {
      next.push(e);
      continue;
    }
    const take = Math.min(e.amount, need);
    const remainder = e.amount - take;
    need -= take;
    if (remainder > 0) next.push({ ...e, amount: remainder });
  }
  return { ledger: next, taken: consume - need };
}
