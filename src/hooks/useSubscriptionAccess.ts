"use client";

import { useEffect, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

export type SubscriptionStatus = "trial" | "active" | "expired" | "cancelled" | null;

type SubscriptionData = {
  loading: boolean;
  status: SubscriptionStatus;
  hasPaidAccess: boolean;
  plan: string | null;
  startDate: string | null;
  endDate: string | null;
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
  const [status, setStatus] = useState<SubscriptionStatus>(null);
  const [hasPaidAccess, setHasPaidAccess] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setStatus(null);
      setHasPaidAccess(false);
      setPlan(null);
      setStartDate(null);
      setEndDate(null);
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
            "subscription_status, subscription_plan, subscription_start_date, subscription_end_date",
          )
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;
        if (error) {
          setStatus(null);
          setHasPaidAccess(false);
          return;
        }

        const normalizedStatus =
          data?.subscription_status === "trial" ||
          data?.subscription_status === "active" ||
          data?.subscription_status === "expired" ||
          data?.subscription_status === "cancelled"
            ? data.subscription_status
            : null;

        setStatus(normalizedStatus);
        setPlan(data?.subscription_plan ?? null);
        setStartDate(data?.subscription_start_date ?? null);
        setEndDate(data?.subscription_end_date ?? null);
        setHasPaidAccess(
          isCurrentlyPaid(normalizedStatus, data?.subscription_end_date ?? null),
        );
      } catch {
        if (!cancelled) {
          setStatus(null);
          setHasPaidAccess(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { loading, status, hasPaidAccess, plan, startDate, endDate };
}
