/**
 * Waitlist notification helpers: email (Resend) + push (FCM).
 * All functions are safe to call from server actions and cron routes.
 */

import { Resend } from "resend";

import { tryGetFirebaseMessaging } from "@/lib/fcm/admin";
import { sendFcmToUserTokens } from "@/lib/fcm/sendNotifications";
import { SMART_PLAN_MONTHLY_DISPLAY } from "@/lib/smartPlanPricing";
import { SITE_URL } from "@/lib/site";

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
  <a href="${process.env.NEXT_PUBLIC_APP_URL ?? SITE_URL}/waitlist/position"
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
    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? SITE_URL}/waitlist/position"
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
  <a href="${process.env.NEXT_PUBLIC_APP_URL ?? SITE_URL}"
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
    <li>${prepbrainConversations} Mastermind conversations</li>
  </ul>
  <p>None of it is gone. It's just paused.</p>
  <a href="${process.env.NEXT_PUBLIC_APP_URL ?? SITE_URL}/pricing"
     style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;border-radius:99px;text-decoration:none;font-weight:700;margin:8px 0">
    Resume your preparation →
  </a>
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
  <a href="${process.env.NEXT_PUBLIC_APP_URL ?? SITE_URL}/pricing"
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
  <a href="${process.env.NEXT_PUBLIC_APP_URL ?? SITE_URL}/pricing"
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
  ${params.prepbrainConversations} Mastermind conversations are all saved.</p>
  <p>They'll be here when you upgrade.</p>
  <a href="${process.env.NEXT_PUBLIC_APP_URL ?? SITE_URL}/pricing"
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
  <a href="${process.env.NEXT_PUBLIC_APP_URL ?? SITE_URL}"
     style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;border-radius:99px;text-decoration:none;font-weight:700;margin:8px 0">
    Start now →
  </a>
  <p style="color:#888;font-size:14px;margin-top:24px">
    Your 3-day timer starts from the moment you open the app.
  </p>
</div>`;
  return { subject, html };
}

function annualPlanActivatedHtml(params: {
  endsAt: string;
  autopayWasCancelled: boolean;
}): { subject: string; html: string } {
  const { endsAt, autopayWasCancelled } = params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? SITE_URL;
  const formattedEnd = new Date(endsAt).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata",
  });
  const subject = `Your annual Smart Plan is active — access until ${formattedEnd}`;
  const autopayLine = autopayWasCancelled
    ? `<p style="background:#fef3c7;border-left:3px solid #f59e0b;padding:10px 14px;border-radius:4px;color:#78350f;font-size:14px;margin:16px 0">
        <strong>Your monthly AutoPay has been cancelled.</strong><br>
        You will not be charged monthly going forward. Your ₹3,591 covers the full year.
       </p>`
    : "";
  const html = `
<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h2 style="font-size:22px;font-weight:600;margin-bottom:8px">Your annual Smart Plan is live.</h2>
  <p style="color:#444;margin:0 0 6px">
    You've paid <strong>₹3,591</strong> for <strong>12 months of full access</strong> to Kalnehi Daily.
  </p>
  <p style="color:#444;margin:0 0 16px">
    Your plan runs until <strong>${formattedEnd}</strong>. No recurring charge — this was a one-time payment.
  </p>
  ${autopayLine}
  <a href="${appUrl}/my-subscription"
     style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;border-radius:99px;text-decoration:none;font-weight:700;margin:8px 0">
    View My Subscription →
  </a>
  <p style="color:#888;font-size:13px;margin-top:24px">
    Questions? Reply to this email or visit <a href="${appUrl}/pricing" style="color:#ff7a00">kalnehi.com/pricing</a>.
  </p>
</div>`;
  return { subject, html };
}

function sixMonthPlanActivatedHtml(params: {
  endsAt: string;
  autopayWasCancelled: boolean;
}): { subject: string; html: string } {
  const { endsAt, autopayWasCancelled } = params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? SITE_URL;
  const formattedEnd = new Date(endsAt).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata",
  });
  const subject = `Your 6-month Smart Plan is active — access until ${formattedEnd}`;
  const autopayLine = autopayWasCancelled
    ? `<p style="background:#fef3c7;border-left:3px solid #f59e0b;padding:10px 14px;border-radius:4px;color:#78350f;font-size:14px;margin:16px 0">
        <strong>Your monthly AutoPay has been cancelled.</strong><br>
        You will not be charged monthly going forward. Your ₹2,154 covers the full 6 months.
       </p>`
    : "";
  const html = `
<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h2 style="font-size:22px;font-weight:600;margin-bottom:8px">Your 6-month Smart Plan is live.</h2>
  <p style="color:#444;margin:0 0 6px">
    You've paid <strong>₹2,154</strong> for <strong>6 months of full access</strong> to Kalnehi Daily.
  </p>
  <p style="color:#444;margin:0 0 16px">
    Your plan runs until <strong>${formattedEnd}</strong>. No recurring charge — this was a one-time payment.
  </p>
  ${autopayLine}
  <a href="${appUrl}/my-subscription"
     style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;border-radius:99px;text-decoration:none;font-weight:700;margin:8px 0">
    View My Subscription →
  </a>
  <p style="color:#888;font-size:13px;margin-top:24px">
    Questions? Reply to this email or visit <a href="${appUrl}/pricing" style="color:#ff7a00">kalnehi.com/pricing</a>.
  </p>
</div>`;
  return { subject, html };
}

function trialQueuedHtml(params: {
  trialStartsAt: string;
  position: number;
  dailyCap: number;
}): { subject: string; html: string } {
  const { trialStartsAt, position, dailyCap } = params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? SITE_URL;
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
    We open ${dailyCap.toLocaleString("en-IN")} spots each day so the app stays fast for everyone.
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
    `Your ${params.streakDays}-day streak is paused — not deleted. Continue for ${SMART_PLAN_MONTHLY_DISPLAY}/month.`,
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
  dailyCap: number;
}): Promise<void> {
  const { subject, html } = trialQueuedHtml({
    trialStartsAt: params.trialStartsAt,
    position: params.position,
    dailyCap: params.dailyCap,
  });
  await sendEmail(params.email, subject, html);
}

export async function sendAnnualPlanActivatedEmail(params: {
  email: string;
  endsAt: string;
  autopayWasCancelled: boolean;
}): Promise<void> {
  const { subject, html } = annualPlanActivatedHtml({
    endsAt: params.endsAt,
    autopayWasCancelled: params.autopayWasCancelled,
  });
  await sendEmail(params.email, subject, html);
}

export async function sendSixMonthPlanActivatedEmail(params: {
  email: string;
  endsAt: string;
  autopayWasCancelled: boolean;
}): Promise<void> {
  const { subject, html } = sixMonthPlanActivatedHtml({
    endsAt: params.endsAt,
    autopayWasCancelled: params.autopayWasCancelled,
  });
  await sendEmail(params.email, subject, html);
}

/* ─────────────────────── Subscription lifecycle emails ─────────────── */

function monthlyWelcomeHtml(params: {
  autopayMonthsTotal: number | null;
}): { subject: string; html: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? SITE_URL;
  const autopayLine =
    params.autopayMonthsTotal !== null
      ? `<p style="color:#444;margin:0 0 16px">
          Your AutoPay is set for up to <strong>${params.autopayMonthsTotal} monthly charge${params.autopayMonthsTotal === 1 ? "" : "s"}</strong>.
          After that, renewals stop automatically — no action needed.
         </p>`
      : "";
  const subject = "Your Smart Plan is now active";
  const html = `
<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h2 style="font-size:22px;font-weight:600;margin-bottom:8px">Welcome to Smart Plan.</h2>
  <p style="color:#444;margin:0 0 16px">
    You're now on the <strong>Smart Plan</strong> at <strong>${SMART_PLAN_MONTHLY_DISPLAY}/month</strong>. You have full access to every feature on Kalnehi Daily — 2 million Mastermind tokens and 100 minutes of voice every month.
  </p>
  ${autopayLine}
  <a href="${appUrl}/my-subscription"
     style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;border-radius:99px;text-decoration:none;font-weight:700;margin:8px 0">
    View My Subscription →
  </a>
  <p style="color:#888;font-size:13px;margin-top:24px">
    You can cancel anytime from My Subscription. Questions? Reply to this email.
  </p>
</div>`;
  return { subject, html };
}

function paymentRetryingHtml(params: {
  graceUntil: string;
}): { subject: string; html: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? SITE_URL;
  const formattedGrace = new Date(params.graceUntil).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata",
  });
  const subject = "Action needed — your payment is retrying";
  const html = `
<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h2 style="font-size:22px;font-weight:600;margin-bottom:8px">Your payment could not be collected.</h2>
  <p style="color:#444;margin:0 0 16px">
    This month's subscription charge failed. Razorpay will automatically retry the payment over the next few days.
  </p>
  <p style="background:#fef3c7;border-left:3px solid #f59e0b;padding:10px 14px;border-radius:4px;color:#78350f;font-size:14px;margin:0 0 16px">
    <strong>Your access continues until ${formattedGrace}</strong> while retries are in progress.
  </p>
  <p style="color:#444;margin:0 0 8px"><strong>To avoid losing access:</strong></p>
  <ul style="color:#444;line-height:1.8;margin:0 0 16px;padding-left:20px">
    <li>If you pay via UPI AutoPay, check that your mandate is active in your bank/UPI app.</li>
    <li>If you pay via card, ensure the card has sufficient balance.</li>
    <li>Razorpay will retry automatically — no action is needed unless your payment method has changed.</li>
  </ul>
  <a href="${appUrl}/my-subscription"
     style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;border-radius:99px;text-decoration:none;font-weight:700;margin:8px 0">
    View My Subscription →
  </a>
  <p style="color:#888;font-size:13px;margin-top:24px">
    If payment continues to fail you will receive another email. Reply here if you need help.
  </p>
</div>`;
  return { subject, html };
}

function subscriptionHaltedHtml(params: {
  accessUntil: string;
}): { subject: string; html: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? SITE_URL;
  const formattedEnd = new Date(params.accessUntil).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata",
  });
  const subject = `Your Smart Plan has been paused — access until ${formattedEnd}`;
  const html = `
<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h2 style="font-size:22px;font-weight:600;margin-bottom:8px">Payment could not be collected.</h2>
  <p style="color:#444;margin:0 0 16px">
    After multiple retry attempts, this month's payment was not successful. Your Smart Plan subscription has been paused.
  </p>
  <p style="background:#fef3c7;border-left:3px solid #f59e0b;padding:10px 14px;border-radius:4px;color:#78350f;font-size:14px;margin:0 0 16px">
    <strong>Your access continues until ${formattedEnd}</strong> — the period you already paid for is protected.
  </p>
  <p style="color:#444;margin:0 0 16px">
    After that date, you will need to re-subscribe to continue using Kalnehi Daily. All your progress, streaks, and data are saved.
  </p>
  <a href="${appUrl}/pricing"
     style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;border-radius:99px;text-decoration:none;font-weight:700;margin:8px 0">
    Re-subscribe →
  </a>
  <p style="color:#888;font-size:13px;margin-top:24px">
    Questions? Reply to this email and we'll help sort it out.
  </p>
</div>`;
  return { subject, html };
}

function cancelledConfirmationHtml(params: {
  accessUntil: string;
}): { subject: string; html: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? SITE_URL;
  const formattedEnd = new Date(params.accessUntil).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata",
  });
  const subject = `Smart Plan cancelled — you keep access until ${formattedEnd}`;
  const html = `
<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h2 style="font-size:22px;font-weight:600;margin-bottom:8px">Your subscription has been cancelled.</h2>
  <p style="color:#444;margin:0 0 16px">
    You will not be charged again. Your AutoPay has been stopped.
  </p>
  <p style="background:#d1fae5;border-left:3px solid #10b981;padding:10px 14px;border-radius:4px;color:#065f46;font-size:14px;margin:0 0 16px">
    <strong>Your full access continues until ${formattedEnd}</strong> — the remainder of your current paid period.
  </p>
  <p style="color:#444;margin:0 0 16px">
    After that date, you can re-subscribe anytime from the pricing page. Your progress, streaks, and data will be waiting.
  </p>
  <a href="${appUrl}/pricing"
     style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;border-radius:99px;text-decoration:none;font-weight:700;margin:8px 0">
    View plans →
  </a>
  <p style="color:#888;font-size:13px;margin-top:24px">
    Changed your mind? You can re-subscribe before ${formattedEnd} and continue without any interruption.
  </p>
</div>`;
  return { subject, html };
}

function subscriptionCompletedHtml(params: {
  accessUntil: string;
  totalMonths: number | null;
}): { subject: string; html: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? SITE_URL;
  const formattedEnd = new Date(params.accessUntil).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata",
  });
  const monthsLine = params.totalMonths
    ? `<p style="color:#444;margin:0 0 16px">All <strong>${params.totalMonths} monthly payment${params.totalMonths === 1 ? "" : "s"}</strong> in your AutoPay plan have been collected.</p>`
    : `<p style="color:#444;margin:0 0 16px">Your AutoPay plan has reached its final charge.</p>`;
  const subject = `Your Smart Plan has completed — access until ${formattedEnd}`;
  const html = `
<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h2 style="font-size:22px;font-weight:600;margin-bottom:8px">Your Smart Plan is complete.</h2>
  ${monthsLine}
  <p style="background:#d1fae5;border-left:3px solid #10b981;padding:10px 14px;border-radius:4px;color:#065f46;font-size:14px;margin:0 0 16px">
    <strong>Your access continues until ${formattedEnd}.</strong> No further charges will be made.
  </p>
  <p style="color:#444;margin:0 0 16px">
    To continue after that date, subscribe again — all your progress is saved.
  </p>
  <a href="${appUrl}/pricing"
     style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;border-radius:99px;text-decoration:none;font-weight:700;margin:8px 0">
    Renew Smart Plan →
  </a>
  <p style="color:#888;font-size:13px;margin-top:24px">
    Questions? Reply to this email or visit <a href="${appUrl}/my-subscription" style="color:#ff7a00">My Subscription</a>.
  </p>
</div>`;
  return { subject, html };
}

function waitlistSkipTrialStartedHtml(): { subject: string; html: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? SITE_URL;
  const subject = "You're in — your 3-day trial has started";
  const html = `
<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h2 style="font-size:22px;font-weight:600;margin-bottom:8px">Waitlist skipped. Your free trial is live.</h2>
  <p style="color:#444;margin:0 0 16px">
    Your ₹19 waitlist skip is confirmed. Your <strong>3-day free trial</strong> has started — every feature, no restrictions.
  </p>
  <ul style="color:#444;line-height:1.8;margin:0 0 16px;padding-left:20px">
    <li><strong>5 minutes</strong> of voice dictation for the trial</li>
    <li><strong>60,000 Mastermind tokens</strong> for the 3-day trial</li>
    <li><strong>5 photo scans</strong> for the trial</li>
    <li>Full syllabus, planner, and habit tracker access</li>
  </ul>
  <p style="color:#666;font-size:14px;margin:0 0 16px">
    Your 3-day timer started the moment you skipped the queue. Make the most of it.
  </p>
  <a href="${appUrl}"
     style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;border-radius:99px;text-decoration:none;font-weight:700;margin:8px 0">
    Start now →
  </a>
  <p style="color:#888;font-size:13px;margin-top:24px">
    After your trial, subscribe to Smart Plan for ${SMART_PLAN_MONTHLY_DISPLAY}/month — get 100 minutes of voice and 2 million Mastermind tokens every month.
  </p>
</div>`;
  return { subject, html };
}

export async function sendMonthlyWelcomeEmail(params: {
  email: string;
  autopayMonthsTotal: number | null;
}): Promise<void> {
  const { subject, html } = monthlyWelcomeHtml({ autopayMonthsTotal: params.autopayMonthsTotal });
  await sendEmail(params.email, subject, html);
}

export async function sendPaymentRetryingEmail(params: {
  email: string;
  graceUntil: string;
}): Promise<void> {
  const { subject, html } = paymentRetryingHtml({ graceUntil: params.graceUntil });
  await sendEmail(params.email, subject, html);
}

export async function sendSubscriptionHaltedEmail(params: {
  email: string;
  accessUntil: string;
}): Promise<void> {
  const { subject, html } = subscriptionHaltedHtml({ accessUntil: params.accessUntil });
  await sendEmail(params.email, subject, html);
}

export async function sendCancelledConfirmationEmail(params: {
  email: string;
  accessUntil: string;
}): Promise<void> {
  const { subject, html } = cancelledConfirmationHtml({ accessUntil: params.accessUntil });
  await sendEmail(params.email, subject, html);
}

export async function sendSubscriptionCompletedEmail(params: {
  email: string;
  accessUntil: string;
  totalMonths: number | null;
}): Promise<void> {
  const { subject, html } = subscriptionCompletedHtml({
    accessUntil: params.accessUntil,
    totalMonths: params.totalMonths,
  });
  await sendEmail(params.email, subject, html);
}

export async function sendWaitlistSkipTrialStartedEmail(params: {
  email: string;
}): Promise<void> {
  const { subject, html } = waitlistSkipTrialStartedHtml();
  await sendEmail(params.email, subject, html);
}
