/**
 * Shared PrepBrain token headroom checks and persistence (base phase pool + bonus_ai_tokens_ledger).
 * Used by /api/prepbrain/usage and /api/prepbrain/chat.
 */

import {
  consumeFromBonusLedger,
  parseBonusLedger,
  totalActiveBonus,
  type BonusLedgerEntry,
} from "@/lib/bonusCreditsLedger";
import {
  effectivePrepbrainTokensUsed,
  getAiTokenBudgetForPhase,
  MONTHLY_AI_TOKEN_CAP,
  PAID_TRIAL_AI_TOKEN_CAP,
  WELCOME_AI_TOKEN_CAP,
  type AiUsagePhase,
  type PrepBrainTokenRow,
  type PrepBrainUsagePayload,
} from "@/lib/prepbrainTokens";

function normalizeUsed(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  return Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0;
}

export function getBonusAiTokensRemaining(bonusLedgerRaw: unknown, now: Date): number {
  return totalActiveBonus(parseBonusLedger(bonusLedgerRaw), now);
}

/** True if user can spend at least one token (room in phase base or active bonus). */
export function hasPrepbrainTokenHeadroom(
  phase: AiUsagePhase,
  tokenRow: PrepBrainTokenRow,
  monthKey: string,
  bonusLedgerRaw: unknown,
  now: Date,
): boolean {
  if (phase === "none") return false;
  const bonusRem = getBonusAiTokensRemaining(bonusLedgerRaw, now);
  if (phase === "monthly") {
    const baseUsed = effectivePrepbrainTokensUsed(tokenRow, monthKey);
    return baseUsed < MONTHLY_AI_TOKEN_CAP || bonusRem > 0;
  }
  const { used, limit } = getAiTokenBudgetForPhase(phase, tokenRow, monthKey);
  return used < limit || bonusRem > 0;
}

export type PrepbrainTokenPersistPatch = Record<string, unknown>;

/**
 * Compute DB patch + in-memory tokenRow after consuming `delta` tokens.
 * Order: fill phase base bucket up to cap, then consume from bonus ledger.
 */
export function computePrepbrainTokenPersist(
  phase: AiUsagePhase,
  tokenRow: PrepBrainTokenRow,
  monthKey: string,
  bonusLedgerRaw: unknown,
  delta: number,
  now: Date,
): { patch: PrepbrainTokenPersistPatch; tokenRow: PrepBrainTokenRow } {
  const deltaSafe = Math.max(0, Math.floor(delta));
  let bonusLed: BonusLedgerEntry[] = parseBonusLedger(bonusLedgerRaw);

  if (phase === "welcome") {
    const wu = normalizeUsed(tokenRow.welcome_ai_tokens_used);
    let remain = deltaSafe;
    const roomBase = Math.max(0, WELCOME_AI_TOKEN_CAP - wu);
    const toBase = Math.min(remain, roomBase);
    const nextW = wu + toBase;
    remain -= toBase;
    if (remain > 0) {
      const { ledger } = consumeFromBonusLedger(bonusLed, remain, now);
      bonusLed = ledger;
    }
    const nextRow: PrepBrainTokenRow = {
      ...tokenRow,
      welcome_ai_tokens_used: nextW,
    };
    return {
      patch: {
        welcome_ai_tokens_used: nextW,
        bonus_ai_tokens_ledger: bonusLed,
        bonus_ai_tokens: totalActiveBonus(bonusLed, now),
        updated_at: now.toISOString(),
      },
      tokenRow: nextRow,
    };
  }

  if (phase === "paid_trial") {
    const pu = normalizeUsed(tokenRow.paid_trial_ai_tokens_used);
    let remain = deltaSafe;
    const roomBase = Math.max(0, PAID_TRIAL_AI_TOKEN_CAP - pu);
    const toBase = Math.min(remain, roomBase);
    const nextP = pu + toBase;
    remain -= toBase;
    if (remain > 0) {
      const { ledger } = consumeFromBonusLedger(bonusLed, remain, now);
      bonusLed = ledger;
    }
    const nextRow: PrepBrainTokenRow = {
      ...tokenRow,
      paid_trial_ai_tokens_used: nextP,
    };
    return {
      patch: {
        paid_trial_ai_tokens_used: nextP,
        bonus_ai_tokens_ledger: bonusLed,
        bonus_ai_tokens: totalActiveBonus(bonusLed, now),
        updated_at: now.toISOString(),
      },
      tokenRow: nextRow,
    };
  }

  if (phase === "monthly") {
    const baseUsed = effectivePrepbrainTokensUsed(tokenRow, monthKey);
    let remain = deltaSafe;
    const roomBase = Math.max(0, MONTHLY_AI_TOKEN_CAP - baseUsed);
    const toBase = Math.min(remain, roomBase);
    const nextBase = baseUsed + toBase;
    remain -= toBase;
    if (remain > 0) {
      const { ledger } = consumeFromBonusLedger(bonusLed, remain, now);
      bonusLed = ledger;
    }
    const nextRow: PrepBrainTokenRow = {
      ...tokenRow,
      ai_tokens_used: nextBase,
      ai_tokens_month: monthKey,
    };
    return {
      patch: {
        ai_tokens_used: nextBase,
        ai_tokens_month: monthKey,
        bonus_ai_tokens_ledger: bonusLed,
        bonus_ai_tokens: totalActiveBonus(bonusLed, now),
        updated_at: now.toISOString(),
      },
      tokenRow: nextRow,
    };
  }

  return { patch: {}, tokenRow };
}

/** Usage bar: `used` is phase base consumption; `limit` includes active bonus pools. */
export function buildPrepbrainUsageDisplayPayload(
  phase: AiUsagePhase,
  tokenRow: PrepBrainTokenRow,
  monthKey: string,
  bonusLedgerRaw: unknown,
  now: Date,
): PrepBrainUsagePayload {
  const { used, limit: phaseCap } = getAiTokenBudgetForPhase(phase, tokenRow, monthKey);
  const bonusRemaining = getBonusAiTokensRemaining(bonusLedgerRaw, now);
  return {
    used,
    limit: phaseCap + bonusRemaining,
    monthKey,
    tier: "pro",
    phase,
    phaseCap,
    bonusRemaining,
  };
}
