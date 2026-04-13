"use client";

import { useCallback, useEffect, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase";
import {
  nextBonusExpiryIso,
  parseBonusLedger,
  totalActiveBonus,
} from "@/lib/bonusCreditsLedger";
import { effectiveUsageForDisplay } from "@/lib/subscriptionUsage";
import { parseSubscriptionTier, type SubscriptionTier } from "@/lib/subscriptionTiers";
import { useAuthStore } from "@/store/useAuthStore";

export type SubscriptionStatus = "trial" | "active" | "expired" | "cancelled" | null;

type UsageData = {
  photoScansUsed: number;
  voiceMinutesUsed: number;
  bonusPhotoScans: number;
  bonusVoiceMinutes: number;
  bonusPhotoScansNextExpiry: string | null;
  bonusVoiceMinutesNextExpiry: string | null;
  usageResetDate: string | null;
};

type SubscriptionData = {
  loading: boolean;
  fetchError: boolean;
  onboardingDone: boolean;
  status: SubscriptionStatus;
  hasPaidAccess: boolean;
  tier: SubscriptionTier | null;
  plan: string | null;
  startDate: string | null;
  endDate: string | null;
  /** Razorpay `total_count` (monthly charges) for the current subscription, when known. */
  autopayMonthsTotal: number | null;
  usage: UsageData;
  refetch: () => void;
};

const EMPTY_USAGE: UsageData = {
  photoScansUsed: 0,
  voiceMinutesUsed: 0,
  bonusPhotoScans: 0,
  bonusVoiceMinutes: 0,
  bonusPhotoScansNextExpiry: null,
  bonusVoiceMinutesNextExpiry: null,
  usageResetDate: null,
};

function isCurrentlyPaid(status: SubscriptionStatus, endDate: string | null): boolean {
  if (status !== "trial" && status !== "active" && status !== "cancelled") return false;
  if (!endDate) return false;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return false;
  return end.getTime() > Date.now();
}

export function useSubscriptionAccess(): SubscriptionData {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [status, setStatus] = useState<SubscriptionStatus>(null);
  const [hasPaidAccess, setHasPaidAccess] = useState(false);
  const [tier, setTier] = useState<SubscriptionTier | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [autopayMonthsTotal, setAutopayMonthsTotal] = useState<number | null>(null);
  const [usage, setUsage] = useState<UsageData>(EMPTY_USAGE);
  const [fetchKey, setFetchKey] = useState(0);

  const refetch = useCallback(() => setFetchKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setOnboardingDone(false);
      setStatus(null);
      setHasPaidAccess(false);
      setTier(null);
      setPlan(null);
      setStartDate(null);
      setEndDate(null);
      setAutopayMonthsTotal(null);
      setUsage(EMPTY_USAGE);
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
          .select(
            "mandatory_onboarding_completed_at, subscription_status, subscription_plan, subscription_start_date, subscription_end_date, subscription_tier, subscription_autopay_months_total, photo_scans_used_this_month, voice_minutes_used_this_month, bonus_photo_scans, bonus_voice_minutes, bonus_photo_scans_ledger, bonus_voice_minutes_ledger, usage_reset_date",
          )
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;
        if (error) {
          setFetchError(true);
          setOnboardingDone(false);
          setStatus(null);
          setHasPaidAccess(false);
          setTier(null);
          setAutopayMonthsTotal(null);
          setUsage(EMPTY_USAGE);
          return;
        }

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
          isCurrentlyPaid(normalizedStatus, data?.subscription_end_date ?? null),
        );
        const eff = effectiveUsageForDisplay(
          data?.usage_reset_date ?? null,
          data?.photo_scans_used_this_month ?? 0,
          data?.voice_minutes_used_this_month ?? 0,
        );
        const now = new Date();
        const photoLed = parseBonusLedger(data?.bonus_photo_scans_ledger);
        const voiceLed = parseBonusLedger(data?.bonus_voice_minutes_ledger);
        setUsage({
          photoScansUsed: eff.photoScansUsed,
          voiceMinutesUsed: eff.voiceMinutesUsed,
          bonusPhotoScans: totalActiveBonus(photoLed, now),
          bonusVoiceMinutes: totalActiveBonus(voiceLed, now),
          bonusPhotoScansNextExpiry: nextBonusExpiryIso(photoLed, now),
          bonusVoiceMinutesNextExpiry: nextBonusExpiryIso(voiceLed, now),
          usageResetDate: data?.usage_reset_date ?? null,
        });
      } catch {
        if (!cancelled) {
          setFetchError(true);
          setOnboardingDone(false);
          setStatus(null);
          setHasPaidAccess(false);
          setTier(null);
          setAutopayMonthsTotal(null);
          setUsage(EMPTY_USAGE);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, fetchKey]);

  return {
    loading,
    fetchError,
    onboardingDone,
    status,
    hasPaidAccess,
    tier,
    plan,
    startDate,
    endDate,
    autopayMonthsTotal,
    usage,
    refetch,
  };
}
