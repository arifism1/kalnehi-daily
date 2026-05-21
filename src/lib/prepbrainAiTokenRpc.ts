/**
 * Atomic PrepBrain **chat** AI token reserve → finalize (or cancel) via Postgres RPC.
 * Debits a conservative estimate before the model; reconciles to real usage after.
 *
 * Scope: used by `/api/prepbrain/chat` only. Voice dictation and
 * voice-parse-draft bill **voice minutes** (and related quotas), not this shared AI token pool.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/** Conservative pre-debit per chat completion (aligned with typical short replies). */
export const PREPBRAIN_AI_TOKEN_RESERVE_ESTIMATE = 1500;

function parseRpcJson(data: unknown): Record<string, unknown> | null {
  if (data === null || data === undefined || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }
  return data as Record<string, unknown>;
}

export async function prepbrainAiTokenReserve(
  admin: SupabaseClient,
  userId: string,
  monthKey: string,
  estimate: number = PREPBRAIN_AI_TOKEN_RESERVE_ESTIMATE,
): Promise<
  | { ok: true; reservationId: string; version: number }
  | { ok: false; error: string; code: string }
> {
  const { data, error } = await admin.rpc("prepbrain_ai_token_reserve", {
    p_user_id: userId,
    p_estimate: estimate,
    p_month_key: monthKey,
  });
  if (error) {
    console.error("[prepbrainAiTokenReserve] rpc error", error.message);
    return { ok: false, error: "Could not reserve AI tokens.", code: "rpc_error" };
  }
  const o = parseRpcJson(data);
  if (!o || o.ok !== true) {
    const code = typeof o?.error === "string" ? o.error : "unknown";
    return {
      ok: false,
      error:
        code === "insufficient_ai_tokens"
          ? "insufficient_ai_tokens"
          : code === "phase_none"
            ? "phase_none"
            : "Could not reserve AI tokens.",
      code,
    };
  }
  const rid = o.reservation_id;
  const ver = o.version;
  if (typeof rid !== "string" || typeof ver !== "number" || !Number.isFinite(ver)) {
    return { ok: false, error: "Invalid reserve response.", code: "invalid_response" };
  }
  return { ok: true, reservationId: rid, version: ver };
}

/**
 * Reconcile reservation to provider-reported usage. If usage is missing/zero, bills the full estimate.
 */
const FINALIZE_RETRY_DELAYS_MS = [0, 150, 400] as const;

/** JSON `error` values from prepbrain_ai_token_finalize that will not succeed on retry. */
const FINALIZE_NON_RETRYABLE = new Set([
  "invalid_args",
  "reservation_not_found",
  "already_cancelled",
  "reservation_expired",
]);

export type AiTokenSplitParams = {
  inputTokens?: number;
  outputTokens?: number;
  provider?: string;
  model?: string;
};

export async function prepbrainAiTokenFinalize(
  admin: SupabaseClient,
  userId: string,
  reservationId: string,
  actualTokens: number,
  split?: AiTokenSplitParams,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const pActual = Math.max(0, Math.floor(actualTokens));
  let lastError = "Could not finalize AI token usage.";

  for (let attempt = 0; attempt < FINALIZE_RETRY_DELAYS_MS.length; attempt++) {
    const delay = FINALIZE_RETRY_DELAYS_MS[attempt];
    if (delay > 0) {
      // react-doctor-disable-next-line react-doctor/async-await-in-loop -- retry delay loop: sequential retry with exponential backoff
      await new Promise((r) => setTimeout(r, delay));
    }
    // react-doctor-disable-next-line react-doctor/async-await-in-loop -- retry loop: attempt RPC after delay
    const { data, error } = await admin.rpc("prepbrain_ai_token_finalize", {
      p_user_id: userId,
      p_reservation_id: reservationId,
      p_actual: pActual,
      ...(split?.inputTokens !== undefined ? { p_input_tokens: Math.floor(split.inputTokens) } : {}),
      ...(split?.outputTokens !== undefined ? { p_output_tokens: Math.floor(split.outputTokens) } : {}),
      ...(split?.provider !== undefined ? { p_provider: split.provider } : {}),
      ...(split?.model !== undefined ? { p_model: split.model } : {}),
    });
    if (error) {
      console.error(
        "[prepbrainAiTokenFinalize] rpc error",
        error.message,
        `(attempt ${attempt + 1}/${FINALIZE_RETRY_DELAYS_MS.length})`,
      );
      lastError = error.message;
      continue;
    }
    const o = parseRpcJson(data);
    if (!o || o.ok !== true) {
      const code = typeof o?.error === "string" ? o.error : "";
      if (code && FINALIZE_NON_RETRYABLE.has(code)) {
        return { ok: false, error: code };
      }
      lastError = "Could not finalize AI token usage.";
      continue;
    }
    return { ok: true };
  }

  return { ok: false, error: lastError };
}

export async function prepbrainAiTokenCancelReservation(
  admin: SupabaseClient,
  userId: string,
  reservationId: string,
): Promise<void> {
  const { error } = await admin.rpc("prepbrain_ai_token_cancel_reservation", {
    p_user_id: userId,
    p_reservation_id: reservationId,
  });
  if (error) {
    console.error("[prepbrainAiTokenCancelReservation] rpc error", error.message);
  }
}
