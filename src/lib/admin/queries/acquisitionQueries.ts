import type { Json } from "@/types/supabase";

import { listAllAuthUsers } from "@/lib/admin/authUsers";
import { dateKeyIST } from "@/lib/admin/istDates";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export type AcquisitionSnapshot = {
  signupsBySource: { source: string; count: number }[];
  signupsByExam: { exam: string; count: number }[];
  signupsByDay: { day: string; count: number }[];
  topUtmCampaigns: { campaign: string; count: number }[];
  profilesWithAttribution: number;
  totalAuthUsers: number;
};

type Attr = {
  landingPath?: string;
  referrer?: string;
  utm?: Record<string, string>;
};

function inferSource(raw: Json | null): string {
  if (!raw || typeof raw !== "object") return "unknown";
  const a = raw as Attr;
  const ref = (a.referrer ?? "").toLowerCase();
  const utm = a.utm ?? {};
  const src = (utm.utm_source ?? "").toLowerCase();
  const med = (utm.utm_medium ?? "").toLowerCase();
  if (ref.includes("instagram.com") || src.includes("instagram")) return "instagram";
  if (med === "cpc" || med === "paid" || med === "paid_social") return "paid_ad";
  if (src === "referral" || ref.includes("referral")) return "referral";
  if (
    ref.includes("google.") &&
    (ref.includes("/url") || utm.utm_medium === "organic")
  )
    return "organic_search";
  if (!ref && !src) return "direct";
  return "other";
}

export async function getAcquisitionSnapshot(): Promise<AcquisitionSnapshot | null> {
  const admin = getSupabaseServiceRoleClient();
  if (!admin) return null;

  const [authUsers, { data: profs }] = await Promise.all([
    listAllAuthUsers(admin),
    admin.from("user_profiles").select("signup_attribution, target_exam, primary_exam, user_id"),
  ]);

  const profiles = (profs ?? []) as {
    signup_attribution: Json | null;
    target_exam: string | null;
    primary_exam: string | null;
    user_id: string | null;
  }[];

  const bySource = new Map<string, number>();
  const byExam = new Map<string, number>();
  const byDay = new Map<string, number>();
  const byCampaign = new Map<string, number>();

  let withAttr = 0;

  const uidToProfile = new Map(profiles.map((p) => [p.user_id, p]));

  for (const u of authUsers) {
    const day = dateKeyIST(new Date(u.created_at));
    byDay.set(day, (byDay.get(day) ?? 0) + 1);

    const p = uidToProfile.get(u.id);
    const exam = (p?.target_exam || p?.primary_exam || "Unknown").trim() || "Unknown";
    byExam.set(exam, (byExam.get(exam) ?? 0) + 1);

    if (p?.signup_attribution) withAttr++;
    const src = inferSource(p?.signup_attribution ?? null);
    bySource.set(src, (bySource.get(src) ?? 0) + 1);

    if (p?.signup_attribution && typeof p.signup_attribution === "object") {
      const utm = (p.signup_attribution as Attr).utm;
      const camp = utm?.utm_campaign;
      if (camp) byCampaign.set(camp, (byCampaign.get(camp) ?? 0) + 1);
    }
  }

  return {
    signupsBySource: [...bySource.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => ({ source, count })),
    signupsByExam: [...byExam.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([exam, count]) => ({ exam, count })),
    signupsByDay: [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-45).map(([day, count]) => ({
      day,
      count,
    })),
    topUtmCampaigns: [...byCampaign.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([campaign, count]) => ({ campaign, count })),
    profilesWithAttribution: withAttr,
    totalAuthUsers: authUsers.length,
  };
}
