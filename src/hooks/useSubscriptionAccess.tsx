"use client";

/** Import as `@/hooks/useSubscriptionAccess`. If the bundler reports module-not-found after moving/renaming this file, run `rm -rf .next` and restart the dev server. */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase";
import {
  nextBonusExpiryIso,
  parseBonusLedger,
  totalActiveBonus,
} from "@/lib/bonusCreditsLedger";
import {
  freeTrialEndsAt,
  isFreeTrialWindowActive,
  isWelcomeTrialExpired,
  remainingPhotoScansTrial,
  remainingVoiceSecondsTrial,
} from "@/lib/freeTrial";
import { KALNEHI_PROFILE_UPDATED_EVENT } from "@/lib/profileEvents";
import {
  coerceVoiceMinutesUsed,
  effectiveUsageForDisplay,
} from "@/lib/subscriptionUsage";
import { parseSubscriptionTier, type SubscriptionTier } from "@/lib/subscriptionTiers";
import { useAuthStore } from "@/store/useAuthStore";
import {
  normalizeEnabledFeaturesRow,
  useEnabledFeaturesStore,
} from "@/store/useEnabledFeaturesStore";

export type SubscriptionStatus = "trial" | "active" | "expired" | "cancelled" | null;

type UsageData = {
  photoScansUsed: number;
  voiceMinutesUsed: number;
  bonusPhotoScans: number;
  bonusVoiceMinutes: number;
  bonusPhotoScansNextExpiry: string | null;
  bonusVoiceMinutesNextExpiry: string | null;
  /** One-time PrepBrain token packs (30-day pools), used before monthly cap. */
  bonusAiTokens: number;
  bonusAiTokensNextExpiry: string | null;
  usageResetDate: string | null;
};

export type SubscriptionData = {
  loading: boolean;
  fetchError: boolean;
  onboardingDone: boolean;
  status: SubscriptionStatus;
  hasPaidAccess: boolean;
  hasHadTrial: boolean;
  tier: SubscriptionTier | null;
  plan: string | null;
  startDate: string | null;
  endDate: string | null;
  /** Razorpay `total_count` (monthly charges) for the current subscription, when known. */
  autopayMonthsTotal: number | null;
  usage: UsageData;
  /** 3-day free trial start timestamp (not Razorpay). */
  trialStartedAt: string | null;
  trialPhotoScansUsed: number;
  trialVoiceSecondsUsed: number;
  hasUsedFreeTrial: boolean;
  /** True while the 3-day free trial window is open and the user has no paid access. */
  freeTrialActive: boolean;
  /** Eligible new account before `ensureFreeTrialStarted` runs (has_used_free_trial = false). */
  welcomeTrialEligibleUnstarted: boolean;
  freeTrialEndsAtIso: string | null;
  freeTrialPhotoRemaining: number;
  /** Seconds of voice remaining in the 3-day free trial (0–300). */
  freeTrialVoiceSecondsRemaining: number;
  /** Welcome trial clock ended, still no paid plan. */
  welcomeTrialExpiredNoPay: boolean;
  refetch: () => void;
  /** Increments when `refetch()` runs — use to reload dependent data (e.g. PrepBrain usage). */
  refetchVersion: number;
};

const EMPTY_USAGE: UsageData = {
  photoScansUsed: 0,
  voiceMinutesUsed: 0,
  bonusPhotoScans: 0,
  bonusVoiceMinutes: 0,
  bonusPhotoScansNextExpiry: null,
  bonusVoiceMinutesNextExpiry: null,
  bonusAiTokens: 0,
  bonusAiTokensNextExpiry: null,
  usageResetDate: null,
};

function isCurrentlyPaid(
  status: SubscriptionStatus,
  endDate: string | null,
  paymentGraceUntil?: string | null,
): boolean {
  if (status !== "trial" && status !== "active" && status !== "cancelled") return false;
  const now = Date.now();
  if (paymentGraceUntil) {
    const grace = new Date(paymentGraceUntil);
    if (!Number.isNaN(grace.getTime()) && grace.getTime() > now) return true;
  }
  if (!endDate) return false;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return false;
  return end.getTime() > now;
}

/**
 * DB columns for subscription/trial — single source of truth (no duplicate access_level columns).
 * Off-platform unlock (e.g. Razorpay HTTP webhook → Next route): update `subscription_status`
 * and related `subscription_*` / `razorpay_*` fields on `user_profiles`. Welcome window uses
 * `trial_started_at` (see `src/lib/freeTrial.ts`).
 */
const USER_PROFILE_SUBSCRIPTION_SELECT_BASE =
  "mandatory_onboarding_completed_at, subscription_status, subscription_plan, subscription_start_date, subscription_end_date, subscription_tier, subscription_autopay_months_total, has_had_trial, photo_scans_used_this_month, voice_minutes_used_this_month, bonus_photo_scans, bonus_voice_minutes, bonus_photo_scans_ledger, bonus_voice_minutes_ledger, bonus_ai_tokens, bonus_ai_tokens_ledger, usage_reset_date, trial_started_at, trial_photo_scans_used, trial_voice_seconds_used, has_used_free_trial, enabled_features, payment_grace_until";

const SubscriptionAccessContext = createContext<SubscriptionData | null>(null);

/**
 * One shared profile/subscription fetch for the signed-in user (avoids duplicate
 * `user_profiles` queries from every `useSubscriptionAccess` consumer).
 */
export function SubscriptionAccessProvider({ children }: { children: ReactNode }) {
  const value = useSubscriptionAccessState();
  return (
    <SubscriptionAccessContext.Provider value={value}>
      {children}
    </SubscriptionAccessContext.Provider>
  );
}

/** Loads subscription/onboarding for the signed-in user; anonymous callers get defaults. Route/public-page gating is in `AppShell` + `public-paths`. */
export function useSubscriptionAccess(): SubscriptionData {
  const ctx = useContext(SubscriptionAccessContext);
  if (!ctx) {
    throw new Error("useSubscriptionAccess must be used within SubscriptionAccessProvider");
  }
  return ctx;
}

function useSubscriptionAccessState(): SubscriptionData {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [status, setStatus] = useState<SubscriptionStatus>(null);
  const [hasPaidAccess, setHasPaidAccess] = useState(false);
  const [hasHadTrial, setHasHadTrial] = useState(false);
  const [tier, setTier] = useState<SubscriptionTier | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [autopayMonthsTotal, setAutopayMonthsTotal] = useState<number | null>(null);
  const [usage, setUsage] = useState<UsageData>(EMPTY_USAGE);
  const [trialStartedAt, setTrialStartedAt] = useState<string | null>(null);
  const [trialPhotoScansUsed, setTrialPhotoScansUsed] = useState(0);
  const [trialVoiceSecondsUsed, setTrialVoiceSecondsUsed] = useState(0);
  const [hasUsedFreeTrial, setHasUsedFreeTrial] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);

  const refetch = useCallback(() => setFetchKey((k) => k + 1), []);

  const freeTrialActive = useMemo(() => {
    if (hasPaidAccess) return false;
    if (!trialStartedAt) return false;
    return isFreeTrialWindowActive(trialStartedAt);
  }, [hasPaidAccess, trialStartedAt]);

  const welcomeTrialEligibleUnstarted = useMemo(
    () => !hasPaidAccess && !hasUsedFreeTrial && !hasHadTrial,
    [hasPaidAccess, hasUsedFreeTrial, hasHadTrial],
  );

  const freeTrialEndsAtIso = useMemo(() => {
    const end = freeTrialEndsAt(trialStartedAt);
    return end ? end.toISOString() : null;
  }, [trialStartedAt]);

  const freeTrialPhotoRemaining = useMemo(
    () => remainingPhotoScansTrial(trialPhotoScansUsed),
    [trialPhotoScansUsed],
  );

  const freeTrialVoiceSecondsRemaining = useMemo(
    () => remainingVoiceSecondsTrial(trialVoiceSecondsUsed),
    [trialVoiceSecondsUsed],
  );

  const welcomeTrialExpiredNoPay = useMemo(
    () => isWelcomeTrialExpired(trialStartedAt, hasPaidAccess),
    [trialStartedAt, hasPaidAccess],
  );

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      useEnabledFeaturesStore.getState().resetEnabledFeaturesHydration();
      setOnboardingDone(false);
      setStatus(null);
      setHasPaidAccess(false);
      setHasHadTrial(false);
      setTier(null);
      setPlan(null);
      setStartDate(null);
      setEndDate(null);
      setAutopayMonthsTotal(null);
      setUsage(EMPTY_USAGE);
      setTrialStartedAt(null);
      setTrialPhotoScansUsed(0);
      setTrialVoiceSecondsUsed(0);
      setHasUsedFreeTrial(false);
      setLoading(false);
      return;
    }

    void (async () => {
      setLoading(true);
      setFetchError(false);
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("user_profiles")
          .select(USER_PROFILE_SUBSCRIPTION_SELECT_BASE)
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;
        if (error) {
          useEnabledFeaturesStore.getState().resetEnabledFeaturesHydration();
          setFetchError(true);
          setOnboardingDone(false);
          setStatus(null);
          setHasPaidAccess(false);
          setTier(null);
          setAutopayMonthsTotal(null);
          setUsage(EMPTY_USAGE);
          setTrialStartedAt(null);
          setTrialPhotoScansUsed(0);
          setTrialVoiceSecondsUsed(0);
          setHasUsedFreeTrial(false);
          return;
        }

        useEnabledFeaturesStore.getState().setEnabledFeatures(
          normalizeEnabledFeaturesRow(data?.enabled_features),
        );

        setOnboardingDone(!!data?.mandatory_onboarding_completed_at);

        const normalizedStatus =
          data?.subscription_status === "trial" ||
          data?.subscription_status === "active" ||
          data?.subscription_status === "expired" ||
          data?.subscription_status === "cancelled"
            ? data.subscription_status
            : null;

        setStatus(normalizedStatus);
        setTier(parseSubscriptionTier(data?.subscription_tier ?? undefined));
        setPlan(data?.subscription_plan ?? null);
        setStartDate(data?.subscription_start_date ?? null);
        setEndDate(data?.subscription_end_date ?? null);
        const rawAutopay = data?.subscription_autopay_months_total;
        setAutopayMonthsTotal(
          typeof rawAutopay === "number" && Number.isFinite(rawAutopay) ? rawAutopay : null,
        );
        setHasPaidAccess(
          isCurrentlyPaid(
            normalizedStatus,
            data?.subscription_end_date ?? null,
            (data as { payment_grace_until?: string | null } | null)?.payment_grace_until ?? null,
          ),
        );
        setHasHadTrial(!!data?.has_had_trial);
        setTrialStartedAt(
          typeof data?.trial_started_at === "string" ? data.trial_started_at : null,
        );
        setTrialPhotoScansUsed(
          typeof data?.trial_photo_scans_used === "number" ? data.trial_photo_scans_used : 0,
        );
        setTrialVoiceSecondsUsed(
          typeof data?.trial_voice_seconds_used === "number" ? data.trial_voice_seconds_used : 0,
        );
        setHasUsedFreeTrial(!!data?.has_used_free_trial);
        const eff = effectiveUsageForDisplay(
          data?.usage_reset_date ?? null,
          data?.subscription_start_date ?? null,
          data?.photo_scans_used_this_month ?? 0,
          coerceVoiceMinutesUsed(data?.voice_minutes_used_this_month),
        );
        const now = new Date();
        const photoLed = parseBonusLedger(data?.bonus_photo_scans_ledger);
        const voiceLed = parseBonusLedger(data?.bonus_voice_minutes_ledger);
        const aiTokLed = parseBonusLedger(data?.bonus_ai_tokens_ledger);
        setUsage({
          photoScansUsed: eff.photoScansUsed,
          voiceMinutesUsed: eff.voiceMinutesUsed,
          bonusPhotoScans: totalActiveBonus(photoLed, now),
          bonusVoiceMinutes: totalActiveBonus(voiceLed, now),
          bonusPhotoScansNextExpiry: nextBonusExpiryIso(photoLed, now),
          bonusVoiceMinutesNextExpiry: nextBonusExpiryIso(voiceLed, now),
          bonusAiTokens:
            typeof data?.bonus_ai_tokens === "number" && Number.isFinite(data.bonus_ai_tokens)
              ? Math.max(0, Math.floor(data.bonus_ai_tokens))
              : totalActiveBonus(aiTokLed, now),
          bonusAiTokensNextExpiry: nextBonusExpiryIso(aiTokLed, now),
          usageResetDate: data?.usage_reset_date ?? null,
        });
      } catch {
        if (!cancelled) {
          useEnabledFeaturesStore.getState().resetEnabledFeaturesHydration();
          setFetchError(true);
          setOnboardingDone(false);
          setStatus(null);
          setHasPaidAccess(false);
          setTier(null);
          setAutopayMonthsTotal(null);
          setUsage(EMPTY_USAGE);
          setTrialStartedAt(null);
          setTrialPhotoScansUsed(0);
          setTrialVoiceSecondsUsed(0);
          setHasUsedFreeTrial(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, fetchKey]);

  useEffect(() => {
    const onProfile = () => refetch();
    window.addEventListener(KALNEHI_PROFILE_UPDATED_EVENT, onProfile);
    return () =>
      window.removeEventListener(KALNEHI_PROFILE_UPDATED_EVENT, onProfile);
  }, [refetch]);

  return {
    loading,
    fetchError,
    onboardingDone,
    status,
    hasPaidAccess,
    hasHadTrial,
    tier,
    plan,
    startDate,
    endDate,
    autopayMonthsTotal,
    usage,
    trialStartedAt,
    trialPhotoScansUsed,
    trialVoiceSecondsUsed,
    hasUsedFreeTrial,
    freeTrialActive,
    welcomeTrialEligibleUnstarted,
    freeTrialEndsAtIso,
    freeTrialPhotoRemaining,
    freeTrialVoiceSecondsRemaining,
    welcomeTrialExpiredNoPay,
    refetch,
    refetchVersion: fetchKey,
  };
}
