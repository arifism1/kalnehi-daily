"use client";

import { useCallback, useEffect, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { SubscriptionTier } from "@/lib/subscriptionTiers";
import { useAuthStore } from "@/store/useAuthStore";

export type SubscriptionStatus = "trial" | "active" | "expired" | "cancelled" | null;

type UsageData = {
  photoScansUsed: number;
  voiceMinutesUsed: number;
  bonusPhotoScans: number;
  bonusVoiceMinutes: number;
  usageResetDate: string | null;
};

type SubscriptionData = {
  loading: boolean;
  onboardingDone: boolean;
  status: SubscriptionStatus;
  hasPaidAccess: boolean;
  tier: SubscriptionTier | null;
  plan: string | null;
  startDate: string | null;
  endDate: string | null;
  usage: UsageData;
  refetch: () => void;
};

const EMPTY_USAGE: UsageData = {
  photoScansUsed: 0,
  voiceMinutesUsed: 0,
  bonusPhotoScans: 0,
  bonusVoiceMinutes: 0,
  usageResetDate: null,
};

function isCurrentlyPaid(status: SubscriptionStatus, endDate: string | null): boolean {
  if (status !== "trial" && status !== "active" && status !== "cancelled") return false;
  if (!endDate) return false;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return false;
  return end.getTime() > Date.now();
}

function normalizeTier(raw: string | null | undefined): SubscriptionTier | null {
  if (raw === "basic" || raw === "pro" || raw === "pro_max") return raw;
  return null;
}

export function useSubscriptionAccess(): SubscriptionData {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [status, setStatus] = useState<SubscriptionStatus>(null);
  const [hasPaidAccess, setHasPaidAccess] = useState(false);
  const [tier, setTier] = useState<SubscriptionTier | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
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
      setUsage(EMPTY_USAGE);
      setLoading(false);
      return;
    }

    void (async () => {
      setLoading(true);
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("user_profiles")
          .select(
            "mandatory_onboarding_completed_at, subscription_status, subscription_plan, subscription_start_date, subscription_end_date, subscription_tier, photo_scans_used_this_month, voice_minutes_used_this_month, bonus_photo_scans, bonus_voice_minutes, usage_reset_date",
          )
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;
        if (error) {
          setOnboardingDone(false);
          setStatus(null);
          setHasPaidAccess(false);
          setTier(null);
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
        setTier(normalizeTier(data?.subscription_tier));
        setPlan(data?.subscription_plan ?? null);
        setStartDate(data?.subscription_start_date ?? null);
        setEndDate(data?.subscription_end_date ?? null);
        setHasPaidAccess(
          isCurrentlyPaid(normalizedStatus, data?.subscription_end_date ?? null),
        );
        setUsage({
          photoScansUsed: data?.photo_scans_used_this_month ?? 0,
          voiceMinutesUsed: data?.voice_minutes_used_this_month ?? 0,
          bonusPhotoScans: data?.bonus_photo_scans ?? 0,
          bonusVoiceMinutes: data?.bonus_voice_minutes ?? 0,
          usageResetDate: data?.usage_reset_date ?? null,
        });
      } catch {
        if (!cancelled) {
          setOnboardingDone(false);
          setStatus(null);
          setHasPaidAccess(false);
          setTier(null);
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
    onboardingDone,
    status,
    hasPaidAccess,
    tier,
    plan,
    startDate,
    endDate,
    usage,
    refetch,
  };
}
