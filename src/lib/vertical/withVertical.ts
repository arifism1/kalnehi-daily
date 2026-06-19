/**
 * withVertical — the SINGLE sanctioned path for tagging and filtering vertical-scoped data.
 *
 * RLS only enforces row ownership; it cannot see the request host (REFRACTOR_PLAN.md §5).
 * So every write to a vertical-tagged table must stamp `vertical`, and every read must
 * filter by it. Centralizing this here lets a CI lint flag raw `.insert()/.upsert()` on
 * tagged tables that bypass `stampVertical`, and makes the isolation auditable.
 *
 * Pure + framework-light: `stampVertical` is pure; `applyVerticalFilter` is a thin wrapper
 * over any PostgREST-style builder exposing `.eq()`.
 */
import type { VerticalId } from "@/verticals";

type Row = Record<string, unknown>;

/** Stamp `vertical` onto an insert/upsert payload (single row or array). */
export function stampVertical<T extends Row>(
  payload: T,
  vertical: VerticalId,
): T & { vertical: VerticalId };
export function stampVertical<T extends Row>(
  payload: T[],
  vertical: VerticalId,
): (T & { vertical: VerticalId })[];
export function stampVertical<T extends Row>(
  payload: T | T[],
  vertical: VerticalId,
): (T & { vertical: VerticalId }) | (T & { vertical: VerticalId })[] {
  if (Array.isArray(payload)) {
    return payload.map((row) => ({ ...row, vertical }));
  }
  return { ...payload, vertical };
}

/** Minimal shape of a PostgREST filter builder we depend on. */
export interface VerticalFilterable<Q> {
  eq(column: string, value: string): Q;
}

/** Append `.eq("vertical", vertical)` to a read query. */
export function applyVerticalFilter<Q extends VerticalFilterable<Q>>(
  query: Q,
  vertical: VerticalId,
): Q {
  return query.eq("vertical", vertical);
}
