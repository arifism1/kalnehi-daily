/**
 * Waitlist notification helpers: email (Resend) + push (FCM).
 * All functions are safe to call from server actions and cron routes.
 */

import { Resend } from "resend";

import { tryGetFirebaseMessaging } from "@/lib/fcm/admin";
import { sendFcmToUserTokens } from "@/lib/fcm/sendNotifications";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

const FROM_EMAIL = "Kalnehi Daily <noreply@kalnehi.com>";

export type NotificationChannel = "email" | "push" | "both";

/* ─────────────────────────────── Email templates ────────────────────── */

function waitlistConfirmHtml(params: {
  position: number;
  batchNumber: number;
  opensAt: string;
  aheadCount: number;
}): { subject: string; html: string } {
  const { position, batchNumber, opensAt, aheadCount } = params;
  const date = new Date(opensAt).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  const subject = `You're #${position.toLocaleString("en-IN")} — here's when you get in`;
  const html = `
<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h2 style="font-size:22px;font-weight:600;margin-bottom:8px">You're in Batch ${batchNumber}.</h2>
  <p style="color:#666;margin:0 0 16px">Your access date: <strong>${date}</strong><br>
  ${aheadCount.toLocaleString("en-IN")} students are ahead of you.</p>
  <p>If you don't want to wait — skip the queue for ₹19:</p>
  <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://kalnehi.com"}/waitlist/position"
     style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;border-radius:99px;text-decoration:none;font-weight:700;margin:8px 0">
    Start immediately →
  </a>
  <p style="color:#888;font-size:14px;margin-top:24px">
    Otherwise, we'll remind you the day before your batch opens.<br>
    Your spot is locked. It won't change.
  </p>
</div>`;
  return { subject, html };
}

function batchTomorrowHtml(params: {
  batchNumber: number;
  opensAt: string;
}): { subject: string; html: string } {
  const { batchNumber, opensAt } = params;
  const timeStr = new Date(opensAt).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata",
  });
  const subject = `Tomorrow is your day — Batch ${batchNumber} opens at ${timeStr}`;
  const html = `
<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h2 style="font-size:22px;font-weight:600">Your free 3-day trial starts tomorrow.</h2>
  <p>Batch ${batchNumber} opens: <strong>${timeStr} IST</strong></p>
  <p>Be ready. Spots fill fast.</p>
  <p style="color:#888;font-size:14px;margin-top:20px">
    Can't wait until tomorrow? ₹19 gets you in right now.<br>
    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://kalnehi.com"}/waitlist/position"
       style="color:#ff7a00">Skip the wait →</a>
  </p>
</div>`;
  return { subject, html };
}

function batchOpenHtml(params: { batchNumber: number }): { subject: string; html: string } {
  const { batchNumber } = params;
  const subject = `You're in. Batch ${batchNumber} is live.`;
  const html = `
<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h2 style="font-size:22px;font-weight:600">You're in. Batch ${batchNumber} is live.</h2>
  <p>Your 3-day free trial starts now.</p>
  <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://kalnehi.com"}"
     style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;border-radius:99px;text-decoration:none;font-weight:700;margin:8px 0">
    Start Kalnehi →
  </a>
</div>`;
  return { subject, html };
}

function pausedHtml(params: {
  streakDays: number;
  syllabusPercent: number;
  doubtsLogged: number;
  prepbrainConversations: number;
}): { subject: string; html: string } {
  const { streakDays, syllabusPercent, doubtsLogged, prepbrainConversations } = params;
  const subject = `Your streak is paused at ${streakDays} days`;
  const html = `
<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h2 style="font-size:22px;font-weight:600">Your Kalnehi trial has ended.</h2>
  <p>Here's what's waiting for you:</p>
  <ul style="color:#444;line-height:1.8">
    <li>${streakDays}-day streak</li>
    <li>${syllabusPercent}% syllabus complete</li>
    <li>${doubtsLogged} doubts logged</li>
    <li>${prepbrainConversations} PrepBrain conversations</li>
  </ul>
  <p>None of it is gone. It's just paused.</p>
  <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://kalnehi.com"}/pricing"
     style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;border-radius:99px;text-decoration:none;font-weight:700;margin:8px 0">
    Resume your preparation →
  </a>
  <p style="color:#888;font-size:14px;margin-top:20px">
    Still not sure? Try 3 more days for ₹19 →
  </p>
</div>`;
  return { subject, html };
}

function retargetingD7Html(params: { streakDays: number }): { subject: string; html: string } {
  const subject = "Your rank isn't waiting for you";
  const html = `
<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h2 style="font-size:22px;font-weight:600">It's been 7 days since your Kalnehi trial ended.</h2>
  <p>Your streak is still paused at <strong>${params.streakDays} days</strong>.</p>
  <p>The students who converted are now further ahead on their syllabus.</p>
  <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://kalnehi.com"}/pricing"
     style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;border-radius:99px;text-decoration:none;font-weight:700;margin:8px 0">
    Resume →
  </a>
</div>`;
  return { subject, html };
}

function retargetingD14Html(params: {
  insight: string;
}): { subject: string; html: string } {
  const subject = "One thing Mastermind found in your data";
  const html = `
<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h2 style="font-size:22px;font-weight:600">When you were on Kalnehi, Mastermind noticed:</h2>
  <blockquote style="border-left:3px solid #ff7a00;padding-left:16px;color:#444;font-style:italic">
    ${params.insight}
  </blockquote>
  <p>That gap is still there.</p>
  <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://kalnehi.com"}/pricing"
     style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;border-radius:99px;text-decoration:none;font-weight:700;margin:8px 0">
    Continue →
  </a>
</div>`;
  return { subject, html };
}

function day3MorningHtml(params: {
  streakDays: number;
  syllabusPercent: number;
  prepbrainConversations: number;
}): { subject: string; html: string } {
  const subject = "Today is your last free day";
  const html = `
<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h2 style="font-size:22px;font-weight:600">Your trial ends tonight.</h2>
  <p>Your ${params.streakDays}-day streak, ${params.syllabusPercent}% syllabus progress, and
  ${params.prepbrainConversations} PrepBrain conversations are all saved.</p>
  <p>They'll be here when you upgrade.</p>
  <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://kalnehi.com"}/pricing"
     style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;border-radius:99px;text-decoration:none;font-weight:700;margin:8px 0">
    See Smart Plan options →
  </a>
</div>`;
  return { subject, html };
}

function trialActivationHtml(): { subject: string; html: string } {
  const subject = "Your free trial on Kalnehi Daily is now active";
  const html = `
<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h2 style="font-size:22px;font-weight:600;margin-bottom:8px">Your free trial is live.</h2>
  <p style="color:#444;margin:0 0 16px">
    You were on our list for a free spot — it just opened. You now have <strong>3 days of full access</strong>
    to every feature on Kalnehi Daily.
  </p>
  <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://kalnehi.com"}"
     style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;border-radius:99px;text-decoration:none;font-weight:700;margin:8px 0">
    Start now →
  </a>
  <p style="color:#888;font-size:14px;margin-top:24px">
    Your 3-day timer starts from the moment you open the app.<br>
    If you haven't already, you can also skip the queue and start instantly for ₹19 at
    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://kalnehi.com"}/waitlist/position"
       style="color:#ff7a00">kalnehi.com/waitlist/position</a>.
  </p>
</div>`;
  return { subject, html };
}

function trialQueuedHtml(params: {
  trialStartsAt: string;
  position: number;
}): { subject: string; html: string } {
  const { trialStartsAt, position } = params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://kalnehi.com";
  const date = new Date(trialStartsAt).toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  const subject = `Your Kalnehi trial begins ${date} at 12:00 AM — you're #${position.toLocaleString("en-IN")}`;
  const html = `
<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h2 style="font-size:22px;font-weight:600;margin-bottom:8px">You're in — your spot is locked.</h2>
  <p style="color:#666;margin:0 0 6px">
    Today's free trial slots are full. That's the only reason you're waiting.
  </p>
  <p style="color:#666;margin:0 0 20px">
    Your 3-day trial begins on <strong>${date}</strong> at <strong>12:00 AM IST</strong>.<br>
    No action needed — just sign in at midnight and you're good to go.
  </p>
  <p style="font-size:14px;color:#888;margin:0 0 20px">
    You're <strong>#${position.toLocaleString("en-IN")}</strong> in today's queue.
    We open 2,000 spots each day so the app stays fast for everyone.
  </p>
  <p style="font-size:15px;font-weight:600;margin:0 0 8px">Don't want to wait until midnight?</p>
  <a href="${appUrl}/waitlist/position"
     style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;border-radius:99px;text-decoration:none;font-weight:700;margin:0 0 20px">
    Start right now for ₹19 →
  </a>
  <p style="color:#aaa;font-size:13px;margin:0">
    Same 3 days. Instant access. Your profile and exam goals are all saved.
  </p>
</div>`;
  return { subject, html };
}

/* ─────────────────────────────── Send helpers ───────────────────────── */

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const resend = getResend();
  if (!resend) {
    console.warn("[waitlist/notifications] RESEND_API_KEY not set — skipping email");
    return;
  }
  try {
    await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
  } catch (e) {
    console.error("[waitlist/notifications] email send failed", e instanceof Error ? e.message : e);
  }
}

export async function sendPush(
  userId: string,
  title: string,
  body: string,
  path: string = "/",
): Promise<void> {
  const sdk = tryGetFirebaseMessaging();
  if (!sdk.ok) {
    console.warn("[waitlist/notifications] FCM unavailable:", sdk.reason);
    return;
  }
  try {
    await sendFcmToUserTokens(sdk.messaging, userId, {
      title,
      body,
      data: { kind: "waitlist", path },
    });
  } catch (e) {
    console.error("[waitlist/notifications] push send failed", e instanceof Error ? e.message : e);
  }
}

/* ─────────────────────────────── Notification callers ──────────────── */

export async function sendWaitlistConfirm(params: {
  email: string;
  position: number;
  batchNumber: number;
  opensAt: string;
  aheadCount: number;
}): Promise<void> {
  const { subject, html } = waitlistConfirmHtml(params);
  await sendEmail(params.email, subject, html);
}

export async function sendBatchTomorrow(params: {
  email: string | null;
  userId: string;
  channel: NotificationChannel;
  batchNumber: number;
  opensAt: string;
}): Promise<void> {
  if (params.channel === "email" || params.channel === "both") {
    if (params.email) {
      const { subject, html } = batchTomorrowHtml(params);
      await sendEmail(params.email, subject, html);
    }
  }
  if (params.channel === "push" || params.channel === "both") {
    await sendPush(
      params.userId,
      `Tomorrow: Batch ${params.batchNumber} opens`,
      "Your free 3-day trial starts tomorrow. Be ready.",
      "/",
    );
  }
}

export async function sendBatchOpen(params: {
  email: string | null;
  userId: string;
  channel: NotificationChannel;
  batchNumber: number;
}): Promise<void> {
  if (params.channel === "push" || params.channel === "both") {
    await sendPush(
      params.userId,
      `Batch ${params.batchNumber} is live`,
      "You're in. Your 3-day free trial starts now.",
      "/",
    );
  }
  if (params.channel === "email" || params.channel === "both") {
    if (params.email) {
      const { subject, html } = batchOpenHtml(params);
      await sendEmail(params.email, subject, html);
    }
  }
}

export async function sendBatch1Hr(params: {
  userId: string;
  batchNumber: number;
}): Promise<void> {
  await sendPush(
    params.userId,
    `Batch ${params.batchNumber} opens in 1 hour`,
    "Tap here to be first in line.",
    "/",
  );
}

export async function sendDay2Nudge(params: {
  userId: string;
  streakDays: number;
  hasUsedPrepbrain: boolean;
}): Promise<void> {
  const title = "24 hours left in your trial";
  const body = params.hasUsedPrepbrain
    ? `You have 24 hours left. Your ${params.streakDays}-day streak is building.`
    : "Have you asked Mastermind what to focus on this week?";
  await sendPush(params.userId, title, body, params.hasUsedPrepbrain ? "/" : "/mastermind");
}

export async function sendDay3Morning(params: {
  email: string | null;
  userId: string;
  streakDays: number;
  syllabusPercent: number;
  prepbrainConversations: number;
}): Promise<void> {
  await sendPush(
    params.userId,
    "Today is your last free day",
    `Your ${params.streakDays}-day streak and ${params.syllabusPercent}% syllabus progress are saved.`,
    "/pricing",
  );
  if (params.email) {
    const { subject, html } = day3MorningHtml(params);
    await sendEmail(params.email, subject, html);
  }
}

export async function sendDay3Evening(params: {
  userId: string;
  streakDays: number;
}): Promise<void> {
  await sendPush(
    params.userId,
    "Your trial ends in a few hours",
    `Your ${params.streakDays}-day streak is paused — not deleted. Continue for ₹399/month.`,
    "/pricing",
  );
}

export async function sendPaused(params: {
  email: string;
  streakDays: number;
  syllabusPercent: number;
  doubtsLogged: number;
  prepbrainConversations: number;
}): Promise<void> {
  const { subject, html } = pausedHtml(params);
  await sendEmail(params.email, subject, html);
}

export async function sendRetargetingD7(params: {
  email: string;
  streakDays: number;
}): Promise<void> {
  const { subject, html } = retargetingD7Html(params);
  await sendEmail(params.email, subject, html);
}

export async function sendRetargetingD14(params: {
  email: string;
  insight: string;
}): Promise<void> {
  const { subject, html } = retargetingD14Html(params);
  await sendEmail(params.email, subject, html);
}

export async function sendTrialActivationEmail(params: { email: string }): Promise<void> {
  const { subject, html } = trialActivationHtml();
  await sendEmail(params.email, subject, html);
}

export async function sendTrialQueuedEmail(params: {
  email: string;
  trialStartsAt: string;
  position: number;
}): Promise<void> {
  const { subject, html } = trialQueuedHtml({
    trialStartsAt: params.trialStartsAt,
    position: params.position,
  });
  await sendEmail(params.email, subject, html);
}
