import crypto from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { activateMonthlySubscriptionFromCapturedWebhookPayment } from "@/actions/subscription";
import {
  extendActiveBonusPoolsBy30Days,
  parseBonusLedger,
  totalActiveBonus,
} from "@/lib/bonusCreditsLedger";
import { autopayMonthsFromNotes } from "@/lib/autopayMonths";
import { RAZORPAY_PAYMENT_OR_SUB_ID_RE } from "@/lib/razorpayIds";
import { currentUsagePeriodStartDateString } from "@/lib/subscriptionUsage";
import type { Database } from "@/types/supabase";
import { createRouteLogger } from "@/lib/logger";
import {
  sendMonthlyWelcomeEmail,
  sendPaymentRetryingEmail,
  sendSubscriptionHaltedEmail,
  sendSubscriptionCompletedEmail,
} from "@/lib/waitlist/notifications";

export const runtime = "nodejs";

const log = createRouteLogger("razorpay/webhook");
const MAX_BODY_BYTES = 64 * 1024;
/**
 * Events to handle. Must match what is enabled in Razorpay Dashboard → Webhooks for
 * https://kalnehi.com/api/razorpay/webhook.
 *
 * payment.captured      → Server-side unlock for Reader `/upgrade` checkout (kalnehi_no_trial
 *                         subscriptions). Idempotent via razorpay_processed_payments.
 * subscription.pending  → Razorpay is auto-retrying a failed charge. Sets payment_grace_until
 *                         (+3 days) and sends a "payment retrying" email to the user.
 * subscription.halted   → All retries exhausted (includes mandate revoked from UPI app).
 *                         Set status="cancelled", preserve end_date so access continues
 *                         until the paid period ends.
 * payment.failed        → Acknowledged but not acted on when attached to a subscription
 *                         (subscription.halted is the terminal signal). Non-subscription
 *                         payment failures are ignored.
 */
const HANDLED_EVENTS = new Set([
  "payment.captured",
  "subscription.charged",
  "subscription.cancelled",
  "subscription.completed",
  "subscription.pending",
  "subscription.halted",
  "payment.failed",
]);

type PlanType = "trial" | "monthly";
type TierType = "basic" | "pro" | "pro_max";
type ProfileUpdate = {
  subscription_status: "trial" | "active" | "expired" | "cancelled";
  subscription_plan: PlanType;
  subscription_tier?: TierType;
  subscription_start_date: string;
  subscription_end_date: string;
  razorpay_subscription_id: string;
  updated_at: string;
};

type WebhookEnvelope = {
  event?: string;
  payload?: {
    subscription?: {
      entity?: {
        id?: string;
        status?: string;
        current_start?: number;
        current_end?: number;
        notes?: Record<string, string>;
      };
    };
    payment?: {
      entity?: {
        id?: string;
        notes?: Record<string, string>;
        subscription_id?: string | null;
      };
    };
  };
};

function getEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!supabaseUrl || !serviceRoleKey || !webhookSecret) return null;
  return { supabaseUrl, serviceRoleKey, webhookSecret };
}

function createAdminClient(config: { supabaseUrl: string; serviceRoleKey: string }) {
  return createClient<Database>(config.supabaseUrl, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function verifySignature(body: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(signature, "utf8");
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

function inferPlan(payload: WebhookEnvelope): PlanType {
  const fromSubscription = payload.payload?.subscription?.entity?.notes?.kalnehi_plan;
  const fromPayment = payload.payload?.payment?.entity?.notes?.kalnehi_plan;
  const plan = fromSubscription ?? fromPayment;
  return plan === "trial" ? "trial" : "monthly";
}

function inferTier(payload: WebhookEnvelope): TierType {
  const fromSub = payload.payload?.subscription?.entity?.notes?.kalnehi_tier;
  const fromPay = payload.payload?.payment?.entity?.notes?.kalnehi_tier;
  const raw = fromSub ?? fromPay;
  if (raw === "basic" || raw === "pro" || raw === "pro_max") return raw;
  return "pro";
}

/**
 * Idempotency key for subscription.charged bonus-pool extension + emails.
 * Prefer payment id; else subscription id + current period (stable per charge cycle).
 */
function subscriptionChargedSideEffectsDedupeKey(
  payload: WebhookEnvelope,
  subscriptionId: string | null,
): string | null {
  const rawPay = (payload.payload?.payment?.entity?.id ?? "").trim();
  if (rawPay && /^pay_[a-zA-Z0-9]+$/.test(rawPay)) return rawPay;

  const sub = payload.payload?.subscription?.entity;
  const sid = (subscriptionId ?? sub?.id ?? "").trim();
  const cs = typeof sub?.current_start === "number" ? sub.current_start : null;
  const ce = typeof sub?.current_end === "number" ? sub.current_end : null;
  if (
    sid &&
    RAZORPAY_PAYMENT_OR_SUB_ID_RE.test(sid) &&
    cs != null &&
    ce != null &&
    cs > 0 &&
    ce > 0
  ) {
    return `wh_charged_${sid}_${cs}_${ce}`;
  }
  return null;
}

function buildUpdateFromSubscription(payload: WebhookEnvelope): ProfileUpdate | null {
  const sub = payload.payload?.subscription?.entity;
  const subId = sub?.id?.trim();
  if (!subId || !RAZORPAY_PAYMENT_OR_SUB_ID_RE.test(subId)) return null;

  const plan = inferPlan(payload);
  const now = new Date();
  const currentStart = typeof sub?.current_start === "number" ? sub.current_start : null;
  const currentEnd = typeof sub?.current_end === "number" ? sub.current_end : null;
  const start = currentStart ? new Date(currentStart * 1000) : now;
  const end = currentEnd ? new Date(currentEnd * 1000) : new Date(now);
  if (!currentEnd) {
    if (plan === "trial") end.setDate(end.getDate() + 3);
    else end.setMonth(end.getMonth() + 1);
  }

  return {
    subscription_status: plan === "trial" ? "trial" : "active",
    subscription_plan: plan,
    subscription_start_date: start.toISOString(),
    subscription_end_date: end.toISOString(),
    razorpay_subscription_id: subId,
    updated_at: now.toISOString(),
  };
}

async function applyBySubscriptionId(
  supabase: ReturnType<typeof createAdminClient>,
  subscriptionId: string,
  patch: Record<string, unknown>,
) {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("user_profiles")
    .update({ ...patch, updated_at: nowIso })
    .eq("razorpay_subscription_id", subscriptionId)
    .select("user_id")
    .limit(1);
  return !error && (data?.length ?? 0) > 0;
}

async function applyByUserId(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  patch: Record<string, unknown>,
) {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("user_profiles")
    .update({ ...patch, updated_at: nowIso })
    .eq("user_id", userId)
    .select("user_id")
    .limit(1);
  return !error && (data?.length ?? 0) > 0;
}

function okResponse(extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: true, ...extra });
}

function errorResponse(status: number) {
  return NextResponse.json({ ok: false }, { status });
}

export async function POST(request: Request) {
  const env = getEnv();
  if (!env) return errorResponse(500);

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_BODY_BYTES) return errorResponse(413);

  const signature = request.headers.get("x-razorpay-signature")?.trim();
  if (!signature) return errorResponse(401);

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) return errorResponse(413);

  if (!verifySignature(rawBody, signature, env.webhookSecret)) {
    return errorResponse(401);
  }

  let payload: WebhookEnvelope;
  try {
    payload = JSON.parse(rawBody) as WebhookEnvelope;
  } catch {
    return errorResponse(400);
  }

  const event = payload.event;
  if (!event || !HANDLED_EVENTS.has(event)) {
    return okResponse({ ignored: true });
  }

  if (event === "payment.captured") {
    const paymentEntity = payload.payload?.payment?.entity;
    const paymentId =
      typeof paymentEntity?.id === "string" ? paymentEntity.id.trim() : "";
    if (!paymentId || !/^pay_[a-zA-Z0-9]+$/.test(paymentId)) {
      return okResponse({ ignored: true });
    }
    const result = await activateMonthlySubscriptionFromCapturedWebhookPayment(paymentId);
    if (!result.ok) {
      log.error("payment.captured activation failed", undefined, {
        error: result.error,
      });
      return errorResponse(500);
    }
    if (result.skipped) return okResponse({ ignored: true });
    return okResponse(result.duplicate ? { duplicate: true as const } : {});
  }

  const supabase = createAdminClient(env);
  const subscriptionEntity = payload.payload?.subscription?.entity;
  const subscriptionId = subscriptionEntity?.id?.trim() ?? null;
  const userIdFromNotes = (
    subscriptionEntity?.notes?.kalnehi_user_id ??
    payload.payload?.payment?.entity?.notes?.kalnehi_user_id
  )?.trim();

  if (subscriptionId && !RAZORPAY_PAYMENT_OR_SUB_ID_RE.test(subscriptionId)) {
    return errorResponse(400);
  }

  if (event === "subscription.charged") {
    const patch = buildUpdateFromSubscription(payload);
    if (!patch) return okResponse({ ignored: true });

    const notes = subscriptionEntity?.notes;
    const autopayFromNotes = autopayMonthsFromNotes(notes);

    const effectivePatch: Record<string, unknown> = {
      ...patch,
      subscription_status: "active",
      subscription_plan: "monthly",
      subscription_tier: inferTier(payload),
      razorpay_subscription_id: subscriptionId ?? patch.razorpay_subscription_id,
      payment_grace_until: null, // Clear any grace period on successful renewal
      ...(autopayFromNotes !== null
        ? { subscription_autopay_months_total: autopayFromNotes }
        : {}),
    };

    let priorStatus: string | null = null;
    let priorPlan: string | null = null;
    if (subscriptionId) {
      const { data: row } = await supabase
        .from("user_profiles")
        .select("subscription_status, subscription_plan")
        .eq("razorpay_subscription_id", subscriptionId)
        .maybeSingle();
      priorStatus = row?.subscription_status ?? null;
      priorPlan = row?.subscription_plan ?? null;
    } else if (userIdFromNotes) {
      const { data: row } = await supabase
        .from("user_profiles")
        .select("subscription_status, subscription_plan")
        .eq("user_id", userIdFromNotes)
        .maybeSingle();
      priorStatus = row?.subscription_status ?? null;
      priorPlan = row?.subscription_plan ?? null;
    }

    // Guard: never let a monthly subscription webhook overwrite an upfront plan.
    // This covers the race window where the webhook arrives just after the user
    // upgraded to annual/six_month (before razorpay_subscription_id was cleared).
    if (priorPlan === "annual" || priorPlan === "six_month") {
      console.info("[webhook] subscription.charged: skipped — user is on upfront plan", {
        priorPlan,
        subscriptionId: subscriptionId?.slice(0, 14) ?? "unknown",
      });
      return okResponse({ ignored: true, reason: "upfront_plan" });
    }

    if (priorStatus === "trial") {
      effectivePatch.photo_scans_used_this_month = 0;
      effectivePatch.voice_minutes_used_this_month = 0;
      const startIso =
        typeof effectivePatch.subscription_start_date === "string"
          ? effectivePatch.subscription_start_date
          : null;
      effectivePatch.usage_reset_date =
        currentUsagePeriodStartDateString(startIso) ?? startIso?.slice(0, 10) ?? null;
      effectivePatch.paid_trial_ai_tokens_used = 0;
    }

    let updated = false;
    if (subscriptionId) {
      updated = await applyBySubscriptionId(supabase, subscriptionId, effectivePatch);
    }
    if (!updated && userIdFromNotes) {
      updated = await applyByUserId(supabase, userIdFromNotes, effectivePatch);
    }

    const chargeUid = userIdFromNotes;
    if (chargeUid && updated) {
      const sideEffectsKey = subscriptionChargedSideEffectsDedupeKey(payload, subscriptionId);
      let runSideEffects = false;
      if (sideEffectsKey) {
        const { error: claimErr } = await supabase.from("razorpay_processed_payments").insert({
          razorpay_payment_id: sideEffectsKey,
          user_id: chargeUid,
          kind: "webhook_charged",
        });
        if (claimErr?.code === "23505") {
          return okResponse({ updated, idempotent: true });
        }
        if (claimErr) {
          console.warn("[webhook] subscription.charged: claim insert failed", claimErr.message);
          return errorResponse(500);
        }
        runSideEffects = true;
      } else {
        console.warn(
          "[webhook] subscription.charged: no side-effects dedupe key; skipping bonus extend and welcome email",
          { subscriptionId: subscriptionId?.slice(0, 14) ?? "none" },
        );
      }

      if (runSideEffects) {
        const { data: bonusRow } = await supabase
          .from("user_profiles")
          .select("bonus_voice_minutes_ledger, bonus_ai_tokens_ledger")
          .eq("user_id", chargeUid)
          .maybeSingle();
        if (bonusRow) {
          const now = new Date();
          const vLed = extendActiveBonusPoolsBy30Days(
            parseBonusLedger(bonusRow.bonus_voice_minutes_ledger),
            now,
          );
          const aLed = extendActiveBonusPoolsBy30Days(
            parseBonusLedger(bonusRow.bonus_ai_tokens_ledger),
            now,
          );
          await supabase
            .from("user_profiles")
            .update({
              bonus_voice_minutes_ledger: vLed,
              bonus_voice_minutes: totalActiveBonus(vLed, now),
              bonus_ai_tokens_ledger: aLed,
              bonus_ai_tokens: totalActiveBonus(aLed, now),
              updated_at: now.toISOString(),
            })
            .eq("user_id", chargeUid);
        }

        if (priorStatus === "trial") {
          const { data: authUser } = await supabase.auth.admin.getUserById(chargeUid);
          const email = authUser?.user?.email;
          if (email) {
            void sendMonthlyWelcomeEmail({
              email,
              autopayMonthsTotal: autopayFromNotes,
            }).catch((e) =>
              console.warn(
                "[webhook] subscription.charged: welcome email failed",
                e instanceof Error ? e.message : e,
              ),
            );
          }
        }
      }
    }

    return okResponse({ updated });
  }

  if (event === "subscription.cancelled") {
    // Guard: if the user has already moved to an upfront plan, the cancellation
    // is for the old monthly sub that was cancelled as part of the upgrade —
    // do not overwrite their active annual/six_month status.
    if (subscriptionId) {
      const { data: guardRow } = await supabase
        .from("user_profiles")
        .select("subscription_plan")
        .eq("razorpay_subscription_id", subscriptionId)
        .maybeSingle();
      const guardPlan = guardRow?.subscription_plan ?? null;
      if (guardPlan === "annual" || guardPlan === "six_month") {
        console.info("[webhook] subscription.cancelled: skipped — user is on upfront plan", {
          guardPlan,
          subscriptionId: subscriptionId.slice(0, 14),
        });
        return okResponse({ ignored: true, reason: "upfront_plan" });
      }
    }

    // Fetch bonus ledgers to snapshot them — needed by mergeResubscribeBonusesAfterMonthlyActivate
    // to restore bonuses if the user resubscribes within the grace window.
    const nowIso = new Date().toISOString();
    let cancelledLedgerSnap: { bonus_voice_minutes_ledger?: unknown; bonus_ai_tokens_ledger?: unknown } | null = null;
    if (subscriptionId) {
      const { data } = await supabase
        .from("user_profiles")
        .select("bonus_voice_minutes_ledger, bonus_ai_tokens_ledger")
        .eq("razorpay_subscription_id", subscriptionId)
        .maybeSingle();
      cancelledLedgerSnap = data;
    } else if (userIdFromNotes) {
      const { data } = await supabase
        .from("user_profiles")
        .select("bonus_voice_minutes_ledger, bonus_ai_tokens_ledger")
        .eq("user_id", userIdFromNotes)
        .maybeSingle();
      cancelledLedgerSnap = data;
    }

    const patch: Record<string, unknown> = {
      subscription_status: "cancelled",
      subscription_cancelled_at: nowIso,
    };
    if (cancelledLedgerSnap?.bonus_voice_minutes_ledger != null) {
      patch.bonus_voice_minutes_ledger_at_cancel = cancelledLedgerSnap.bonus_voice_minutes_ledger;
    }
    if (cancelledLedgerSnap?.bonus_ai_tokens_ledger != null) {
      patch.bonus_ai_tokens_ledger_at_cancel = cancelledLedgerSnap.bonus_ai_tokens_ledger;
    }

    let updated = false;
    if (subscriptionId) {
      updated = await applyBySubscriptionId(supabase, subscriptionId, patch);
    }
    if (!updated && userIdFromNotes) {
      updated = await applyByUserId(supabase, userIdFromNotes, patch);
    }
    return okResponse({ updated });
  }

  if (event === "subscription.completed") {
    const sub = subscriptionEntity;
    const currentEnd = typeof sub?.current_end === "number" ? sub.current_end : null;
    const endIso =
      currentEnd && currentEnd > 0
        ? new Date(currentEnd * 1000).toISOString()
        : new Date().toISOString();
    const totalCountFromNotes = autopayMonthsFromNotes(sub?.notes);
    const patch: Record<string, unknown> = {
      subscription_status: "expired",
      subscription_end_date: endIso,
    };

    let updated = false;
    if (subscriptionId) {
      updated = await applyBySubscriptionId(supabase, subscriptionId, patch);
    }
    if (!updated && userIdFromNotes) {
      updated = await applyByUserId(supabase, userIdFromNotes, patch);
    }

    // Notify the user that all autopay months are used up and when their access ends.
    const completedUserId = userIdFromNotes;
    if (completedUserId) {
      void (async () => {
        try {
          const { data: authData } = await supabase.auth.admin.getUserById(completedUserId);
          const email = authData?.user?.email;
          if (email) {
            await sendSubscriptionCompletedEmail({
              email,
              accessUntil: endIso,
              totalMonths: totalCountFromNotes,
            });
          }
        } catch (e) {
          console.warn("[webhook] subscription.completed: completed email failed", e instanceof Error ? e.message : e);
        }
      })();
    }

    return okResponse({ updated });
  }

  if (event === "subscription.pending") {
    // Razorpay is actively retrying the charge. Grant a 3-day grace period so the user
    // doesn't lose access during the retry window.
    const gracePeriodMs = 3 * 24 * 60 * 60 * 1000;
    const graceUntil = new Date(Date.now() + gracePeriodMs).toISOString();
    const gracePatch: Record<string, unknown> = { payment_grace_until: graceUntil };
    if (subscriptionId) {
      await applyBySubscriptionId(supabase, subscriptionId, gracePatch);
    } else if (userIdFromNotes) {
      await applyByUserId(supabase, userIdFromNotes, gracePatch);
    }
    console.info("[webhook] subscription.pending: grace period set until", graceUntil, {
      subscriptionId: subscriptionId?.slice(0, 14) ?? "unknown",
    });

    // Notify the user that their payment is retrying and access is safe for now.
    if (userIdFromNotes) {
      void (async () => {
        try {
          const { data: authData } = await supabase.auth.admin.getUserById(userIdFromNotes);
          const email = authData?.user?.email;
          if (email) {
            await sendPaymentRetryingEmail({ email, graceUntil });
          }
        } catch (e) {
          console.warn("[webhook] subscription.pending: retry email failed", e instanceof Error ? e.message : e);
        }
      })();
    }

    return okResponse({ graceUntil });
  }

  if (event === "subscription.halted") {
    // All retry attempts exhausted — this includes the case where the customer revoked
    // the UPI autopay mandate from their bank app. Cancel without wiping end_date so the
    // user retains access through the end of their already-paid billing period.

    // Fetch subscription_end_date and bonus ledgers before patching.
    // The ledger snapshot is needed by mergeResubscribeBonusesAfterMonthlyActivate for grace-window resubscriptions.
    let haltedAccessUntil: string | null = null;
    let haltedUserId: string | null = userIdFromNotes ?? null;
    let haltedLedgerSnap: { bonus_voice_minutes_ledger?: unknown; bonus_ai_tokens_ledger?: unknown } | null = null;
    if (subscriptionId) {
      const { data: haltedRow } = await supabase
        .from("user_profiles")
        .select("subscription_end_date, user_id, bonus_voice_minutes_ledger, bonus_ai_tokens_ledger")
        .eq("razorpay_subscription_id", subscriptionId)
        .maybeSingle();
      haltedAccessUntil = haltedRow?.subscription_end_date ?? null;
      if (haltedRow?.user_id) haltedUserId = haltedRow.user_id;
      haltedLedgerSnap = haltedRow;
    } else if (userIdFromNotes) {
      const { data: haltedRow } = await supabase
        .from("user_profiles")
        .select("subscription_end_date, bonus_voice_minutes_ledger, bonus_ai_tokens_ledger")
        .eq("user_id", userIdFromNotes)
        .maybeSingle();
      haltedAccessUntil = haltedRow?.subscription_end_date ?? null;
      haltedLedgerSnap = haltedRow;
    }

    const patch: Record<string, unknown> = {
      subscription_status: "cancelled",
      subscription_cancelled_at: new Date().toISOString(),
    };
    if (haltedLedgerSnap?.bonus_voice_minutes_ledger != null) {
      patch.bonus_voice_minutes_ledger_at_cancel = haltedLedgerSnap.bonus_voice_minutes_ledger;
    }
    if (haltedLedgerSnap?.bonus_ai_tokens_ledger != null) {
      patch.bonus_ai_tokens_ledger_at_cancel = haltedLedgerSnap.bonus_ai_tokens_ledger;
    }

    let updated = false;
    if (subscriptionId) {
      updated = await applyBySubscriptionId(supabase, subscriptionId, patch);
    }
    if (!updated && userIdFromNotes) {
      updated = await applyByUserId(supabase, userIdFromNotes, patch);
    }

    // Notify the user that payment failed permanently and when their access ends.
    if (haltedUserId && haltedAccessUntil) {
      void (async () => {
        try {
          const { data: authData } = await supabase.auth.admin.getUserById(haltedUserId!);
          const email = authData?.user?.email;
          if (email) {
            await sendSubscriptionHaltedEmail({ email, accessUntil: haltedAccessUntil! });
          }
        } catch (e) {
          console.warn("[webhook] subscription.halted: halted email failed", e instanceof Error ? e.message : e);
        }
      })();
    }

    return okResponse({ updated });
  }

  if (event === "payment.failed") {
    const failedPaymentSubId =
      payload.payload?.payment?.entity?.subscription_id?.trim() ?? "";
    if (!failedPaymentSubId || !RAZORPAY_PAYMENT_OR_SUB_ID_RE.test(failedPaymentSubId)) {
      // Not a subscription payment — nothing to act on.
      return okResponse({ ignored: true });
    }

    // For subscription payments Razorpay fires payment.failed on *every* retry attempt,
    // not just the terminal one. Cutting access here would penalise users during the
    // normal retry window. subscription.halted is the reliable terminal signal; we
    // acknowledge this event without changing the profile.
    console.info("[webhook] payment.failed on subscription: awaiting halted/cancelled", {
      subscriptionId: failedPaymentSubId.slice(0, 14),
    });
    return okResponse({ noop: true });
  }

  return okResponse({ ignored: true });
}
