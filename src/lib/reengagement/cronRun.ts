import type { SupabaseClient } from "@supabase/supabase-js";

import { addDaysISTKey, todayISTKey } from "@/lib/admin/istDates";
import { reserveSystemPushDedupe, releaseSystemPushDedupe } from "@/lib/systemPush/dedupe";
import { tryConsumeAutomatedPushBudget } from "@/lib/fcm/pushRateLimit";
import {
  reengagementD1Copy,
  reengagementD2Copy,
  sendReengagementEmail,
  sendReengagementPush,
} from "@/lib/reengagement/notifications";
import { yourPreparationSubjectPhrase } from "@/lib/profileTrackSegment";
import type { Database } from "@/types/supabase";

type Admin = SupabaseClient<Database>;

function dateKeyIST(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

type MetricsRow = {
  user_id: string;
  signup_at: string | null;
  returned_day_1: boolean;
  segment: string;
  total_sessions: number;
};

export async function runSignupReengagementCron(
  admin: Admin,
  istHour: number,
): Promise<{ reengagement_d1: number; reengagement_d2: number }> {
  // 10–11 AM IST — same window as trial day-6 nudge.
  if (istHour < 10 || istHour >= 11) {
    return { reengagement_d1: 0, reengagement_d2: 0 };
  }

  const today = todayISTKey();
  const yesterday = addDaysISTKey(today, -1);
  const twoDaysAgo = addDaysISTKey(today, -2);

  const { data: metricsRows } = await admin
    .from("user_journey_metrics" as never)
    .select("user_id, signup_at, returned_day_1, segment, total_sessions")
    .eq("segment", "explorer")
    .eq("returned_day_1", false)
    .limit(2000);

  const metrics = (metricsRows ?? []) as MetricsRow[];
  const d1Users = metrics.filter(
    (m) =>
      m.signup_at &&
      dateKeyIST(m.signup_at) === yesterday &&
      (m.total_sessions ?? 0) <= 2,
  );
  const d2Users = metrics.filter(
    (m) =>
      m.signup_at &&
      dateKeyIST(m.signup_at) === twoDaysAgo &&
      (m.total_sessions ?? 0) <= 2,
  );

  let d1Sent = 0;
  let d2Sent = 0;

  for (const row of d1Users) {
    const uid = row.user_id;
    const dedupe = await reserveSystemPushDedupe(admin, uid, "reengagement_d1", today);
    if (dedupe !== "reserved") continue;

    const rateOk = await tryConsumeAutomatedPushBudget(admin, uid, today);
    if (!rateOk) {
      await releaseSystemPushDedupe(admin, uid, "reengagement_d1", today);
      continue;
    }

    const { data: prof } = await admin
      .from("user_profiles")
      .select("target_exam, primary_exam, selected_track")
      .eq("user_id", uid)
      .maybeSingle();
    const examLabel = yourPreparationSubjectPhrase(
      prof as {
        target_exam?: string | null;
        primary_exam?: string | null;
        selected_track?: string | null;
      },
    );
    const copy = reengagementD1Copy(examLabel);

    const pushed = await sendReengagementPush(uid, copy.pushTitle, copy.pushBody, "reengagement_d1");
    const { data: authUser } = await admin.auth.admin.getUserById(uid);
    const email = authUser?.user?.email;
    if (email) {
      await sendReengagementEmail(email, copy.emailSubject, copy.emailHtml);
    }
    if (pushed || email) d1Sent++;
  }

  for (const row of d2Users) {
    const uid = row.user_id;
    const dedupe = await reserveSystemPushDedupe(admin, uid, "reengagement_d2", today);
    if (dedupe !== "reserved") continue;

    const rateOk = await tryConsumeAutomatedPushBudget(admin, uid, today);
    if (!rateOk) {
      await releaseSystemPushDedupe(admin, uid, "reengagement_d2", today);
      continue;
    }

    const { data: prof } = await admin
      .from("user_profiles")
      .select("target_exam, primary_exam, selected_track")
      .eq("user_id", uid)
      .maybeSingle();
    const examLabel = yourPreparationSubjectPhrase(
      prof as {
        target_exam?: string | null;
        primary_exam?: string | null;
        selected_track?: string | null;
      },
    );
    const copy = reengagementD2Copy(examLabel);

    const pushed = await sendReengagementPush(uid, copy.pushTitle, copy.pushBody, "reengagement_d2");
    const { data: authUser } = await admin.auth.admin.getUserById(uid);
    const email = authUser?.user?.email;
    if (email) {
      await sendReengagementEmail(email, copy.emailSubject, copy.emailHtml);
    }
    if (pushed || email) d2Sent++;
  }

  return { reengagement_d1: d1Sent, reengagement_d2: d2Sent };
}
