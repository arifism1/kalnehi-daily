/**
 * GET /api/cron/notification-sequences
 * Vercel Cron: runs every 30 minutes.
 * Handles all waitlist lifecycle notifications:
 *   BATCH_TOMORROW, TRIAL_DAY6_NUDGE, TRIAL_DAY7_MORNING, TRIAL_DAY7_EVENING,
 *   PAUSED, RETARGETING_D7, RETARGETING_D14
 *
 * Uses IST for all wall-clock comparisons.
 */
import { type NextRequest, NextResponse } from "next/server";

import { yourPreparationSubjectPhrase } from "@/lib/profileTrackSegment";
import { verifyCronSecret } from "@/lib/verifyCronSecret";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { checkExpiredTrials } from "@/lib/waitlist/batchEngine";
import {
  sendBatchTomorrow,
  sendDay2Nudge,
  sendDay3Morning,
  sendDay3Evening,
  sendPaused,
  sendRetargetingD7,
  sendRetargetingD14,
} from "@/lib/waitlist/notifications";
import { runSignupReengagementCron } from "@/lib/reengagement/cronRun";

export const runtime = "nodejs";
export const maxDuration = 300;

const LOG = "[cron/notification-sequences]";

type ServiceRoleClient = NonNullable<ReturnType<typeof getSupabaseServiceRoleClient>>;

/** Current IST hour (0-23). */
function istHour(): number {
  const now = new Date();
  const ist = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    hour12: false,
  }).format(now);
  return parseInt(ist, 10);
}

function trialDayNumber(trialStartedAt: string, now: Date): number {
  const startMs = new Date(trialStartedAt).getTime();
  const diffMs = now.getTime() - startMs;
  return Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1; // calendar day index from trial_started_at (1 = first day)
}

type ProfileRow = {
  user_id: string;
  trial_started_at: string | null;
  subscription_status: string | null;
  subscription_end_date: string | null;
  streak_count?: number | null;
  welcome_ai_tokens_used?: number | null;
  has_had_trial?: boolean | null;
};

async function runNotificationSequencesCron(admin: ServiceRoleClient): Promise<NextResponse> {
  const now = new Date();
  const nowIso = now.toISOString();
  const hour = istHour();
  const stats: Record<string, number> = {};

  /* ── 1. BATCH_TOMORROW: send 24h before opens_at ─────────────────── */
  {
    const windowStart = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString();
    const windowEnd = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();

    const { data: batchesDue } = await admin
      .from("batches")
      .select("id, batch_number, opens_at")
      .eq("status", "scheduled")
      .gte("opens_at", windowStart)
      .lte("opens_at", windowEnd);

    let tomorrowSent = 0;
    for (const batch of batchesDue ?? []) {
      const b = batch as { id: string; batch_number: number; opens_at: string };
      // react-doctor-disable-next-line react-doctor/async-await-in-loop -- sequential: each batch's entries depend on the previous query result
      const { data: entries } = await admin
        .from("waitlist_entries")
        .select("user_id, notification_channel, contact_email")
        .eq("batch_id", b.id)
        .eq("status", "waiting");

      for (const entry of entries ?? []) {
        const e = entry as { user_id: string; notification_channel: string; contact_email: string | null };
        // react-doctor-disable-next-line react-doctor/async-await-in-loop -- sequential per-user notification send to avoid rate limits
        const { data: authUser } = await admin.auth.admin.getUserById(e.user_id);
        const email = e.contact_email ?? authUser?.user?.email ?? null;
        // react-doctor-disable-next-line react-doctor/async-await-in-loop -- sequential notification send
        await sendBatchTomorrow({
          email,
          userId: e.user_id,
          channel: e.notification_channel as "email" | "push" | "both",
          batchNumber: b.batch_number,
          opensAt: b.opens_at,
        });
        tomorrowSent++;
      }
    }
    stats.batch_tomorrow = tomorrowSent;
  }

  /* ── 2. Trial lifecycle: TRIAL_DAY6_NUDGE (10 AM IST), TRIAL_DAY7_MORNING (8 AM IST) ─ */
  // Only run during the right IST hours.
  if (hour >= 8 && hour < 11) {
    const { data: activatedEntries } = await admin
      .from("waitlist_entries")
      .select("user_id")
      .eq("status", "activated");

    let trialDay6NudgeSent = 0;
    let trialDay7MorningSent = 0;

    for (const entry of activatedEntries ?? []) {
      const uid = (entry as { user_id: string }).user_id;

      // react-doctor-disable-next-line react-doctor/async-await-in-loop -- per-user sequential processing: each user's state must be read before deciding to send
      const { data: prof } = await admin
        .from("user_profiles")
        .select("user_id, trial_started_at, subscription_status, subscription_end_date, welcome_ai_tokens_used")
        .eq("user_id", uid)
        .maybeSingle();

      if (!prof) continue;
      const p = prof as ProfileRow;
      if (!p.trial_started_at) continue;

      // Skip if already subscribed.
      const isSubscribed =
        (p.subscription_status === "active" || p.subscription_status === "cancelled") &&
        p.subscription_end_date &&
        new Date(p.subscription_end_date) > now;
      if (isSubscribed) continue;

      const dayNum = trialDayNumber(p.trial_started_at, now);

      if (dayNum === 6 && hour >= 10 && hour < 11) {
        const hasUsedPrepbrain = (p.welcome_ai_tokens_used ?? 0) > 0;
        const { count: streakCount } = await admin
          .from("study_sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid);
        await sendDay2Nudge({ userId: uid, streakDays: streakCount ?? 0, hasUsedPrepbrain });
        trialDay6NudgeSent++;
      }

      if (dayNum === 7 && hour >= 8 && hour < 9) {
        const { data: authUser } = await admin.auth.admin.getUserById(uid);
        const email =
          (prof as { contact_email?: string | null } | null)?.contact_email ??
          authUser?.user?.email ??
          null;
        const { count: streakCount } = await admin
          .from("study_sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid);
        await sendDay3Morning({
          email,
          userId: uid,
          streakDays: streakCount ?? 0,
          syllabusPercent: 0, // Approximation — could join user_syllabus_customizations
          prepbrainConversations: Math.floor((p.welcome_ai_tokens_used ?? 0) / 1000),
        });
        trialDay7MorningSent++;
      }
    }
    stats.trial_day6_nudge = trialDay6NudgeSent;
    stats.trial_day7_morning = trialDay7MorningSent;
  }

  /* ── 3. TRIAL_DAY7_EVENING (7 PM IST) ─────────────────────────────── */
  if (hour >= 19 && hour < 20) {
    const { data: activatedEntries } = await admin
      .from("waitlist_entries")
      .select("user_id")
      .eq("status", "activated");

    let trialDay7EveningSent = 0;
    for (const entry of activatedEntries ?? []) {
      const uid = (entry as { user_id: string }).user_id;
      // react-doctor-disable-next-line react-doctor/async-await-in-loop -- per-user sequential processing: each user's trial state must be read before deciding to send
      const { data: prof } = await admin
        .from("user_profiles")
        .select("trial_started_at, subscription_status, subscription_end_date")
        .eq("user_id", uid)
        .maybeSingle();

      if (!prof) continue;
      const p = prof as ProfileRow;
      if (!p.trial_started_at) continue;

      const isSubscribed =
        (p.subscription_status === "active" || p.subscription_status === "cancelled") &&
        p.subscription_end_date &&
        new Date(p.subscription_end_date) > now;
      if (isSubscribed) continue;

      const dayNum = trialDayNumber(p.trial_started_at, now);
      if (dayNum === 7) {
        // react-doctor-disable-next-line react-doctor/async-await-in-loop -- per-user sequential: fetch streak then send notification
        const { count: streakCount } = await admin
          .from("study_sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", uid);
        // react-doctor-disable-next-line react-doctor/async-await-in-loop -- sequential notification send
        await sendDay3Evening({ userId: uid, streakDays: streakCount ?? 0 });
        trialDay7EveningSent++;
      }
    }
    stats.trial_day7_evening = trialDay7EveningSent;
  }

  /* ── 4. PAUSED: trial just expired, no subscription ──────────────── */
  {
    const expiredUserIds = await checkExpiredTrials();
    let pausedSent = 0;
    for (const uid of expiredUserIds) {
      // react-doctor-disable-next-line react-doctor/async-await-in-loop -- per-user sequential processing to avoid rate limits on auth/email providers
      const { data: authUser } = await admin.auth.admin.getUserById(uid);
      const email = authUser?.user?.email;
      if (!email) continue;

      const { data: prof } = await admin
        .from("user_profiles")
        .select("welcome_ai_tokens_used")
        .eq("user_id", uid)
        .maybeSingle();

      const { count: streakCount } = await admin
        .from("study_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count: doubtsCount } = await (admin as any)
        .from("doubts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid);

      await sendPaused({
        email,
        streakDays: streakCount ?? 0,
        syllabusPercent: 0,
        doubtsLogged: doubtsCount ?? 0,
        prepbrainConversations: Math.floor(
          ((prof as { welcome_ai_tokens_used?: number } | null)?.welcome_ai_tokens_used ?? 0) / 1000,
        ),
      });
      pausedSent++;
    }
    stats.paused = pausedSent;
  }

  /* ── 5. RETARGETING_D7 ────────────────────────────────────────────── */
  {
    const d7Cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const d7End = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();

    const { data: retargetEntries } = await admin
      .from("waitlist_entries")
      .select("user_id")
      .eq("status", "expired_no_convert")
      .gte("activated_at", d7Cutoff)
      .lte("activated_at", d7End);

    let d7Sent = 0;
    for (const entry of retargetEntries ?? []) {
      const uid = (entry as { user_id: string }).user_id;
      // react-doctor-disable-next-line react-doctor/async-await-in-loop -- sequential: streakCount depends on authUser; early-continue on missing email
      const { data: authUser } = await admin.auth.admin.getUserById(uid);
      const email = authUser?.user?.email;
      if (!email) continue;

      const { count: streakCount } = await admin
        .from("study_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid);

      await sendRetargetingD7({ email, streakDays: streakCount ?? 0 });
      d7Sent++;
    }
    stats.retargeting_d7 = d7Sent;
  }

  /* ── 6. RETARGETING_D14 ───────────────────────────────────────────── */
  {
    const d14Cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const d14End = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString();

    const { data: retargetEntries } = await admin
      .from("waitlist_entries")
      .select("user_id")
      .eq("status", "expired_no_convert")
      .gte("activated_at", d14Cutoff)
      .lte("activated_at", d14End);

    let d14Sent = 0;
    for (const entry of retargetEntries ?? []) {
      const uid = (entry as { user_id: string }).user_id;
      // react-doctor-disable-next-line react-doctor/async-await-in-loop -- sequential: profile lookup depends on authUser; early-continue on missing email
      const { data: authUser } = await admin.auth.admin.getUserById(uid);
      const email = authUser?.user?.email;
      if (!email) continue;

      // Build a personal insight from their prepbrain conversations.
      const { data: prof } = await admin
        .from("user_profiles")
        .select("target_exam, primary_exam, selected_track, welcome_ai_tokens_used")
        .eq("user_id", uid)
        .maybeSingle();

      const p = prof as {
        target_exam?: string | null;
        primary_exam?: string | null;
        selected_track?: string | null;
        welcome_ai_tokens_used?: number;
      } | null;
      const head = yourPreparationSubjectPhrase({
        selected_track: p?.selected_track,
        target_exam: p?.target_exam,
        primary_exam: p?.primary_exam,
      });
      const insight = `${head} was interrupted. Based on your study sessions and Mastermind usage, your consistency was building — and that momentum is still recoverable.`;

      await sendRetargetingD14({ email, insight });
      d14Sent++;
    }
    stats.retargeting_d14 = d14Sent;
  }

  /* ── Signup re-engagement (explorer, no D1 return) ───────────────── */
  {
    const re = await runSignupReengagementCron(admin, hour);
    stats.reengagement_d1 = re.reengagement_d1;
    stats.reengagement_d2 = re.reengagement_d2;
  }

  // Every run: all counters present so log/JSON parsers never see missing keys (IST windows skip trial blocks).
  stats.batch_tomorrow ??= 0;
  stats.trial_day6_nudge ??= 0;
  stats.trial_day7_morning ??= 0;
  stats.trial_day7_evening ??= 0;
  stats.paused ??= 0;
  stats.retargeting_d7 ??= 0;
  stats.retargeting_d14 ??= 0;
  stats.reengagement_d1 ??= 0;
  stats.reengagement_d2 ??= 0;

  // Deprecated: legacy drains/dashboards keyed day2/day3. Values mirror trial_day6_* / trial_day7_*;
  // semantics are 7-day calendar trial (day 6 / 7), not historical 3-day trial day indices.
  stats.day2_nudge = stats.trial_day6_nudge;
  stats.day3_morning = stats.trial_day7_morning;
  stats.day3_evening = stats.trial_day7_evening;

  console.info(`${LOG} run complete nowIso=${nowIso} istHour=${hour}`, JSON.stringify(stats));
  return NextResponse.json({ ok: true, nowIso, istHour: hour, ...stats });
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    console.warn(`${LOG} unauthorized`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseServiceRoleClient();
  if (!admin) {
    console.warn(`${LOG} service_unavailable`);
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  try {
    return await runNotificationSequencesCron(admin);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stackLine =
      err instanceof Error && err.stack
        ? err.stack.split("\n")[0] ?? ""
        : "";
    console.error(
      `${LOG} failed`,
      JSON.stringify({
        message,
        stackLine,
        nowIso: new Date().toISOString(),
        istHour: istHour(),
      }),
    );
    return NextResponse.json({ error: "Cron job failed." }, { status: 500 });
  }
}
