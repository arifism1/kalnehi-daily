/**
 * Day-1 / day-2 re-engagement for signup explorers who never returned.
 */

import { tryGetFirebaseMessaging } from "@/lib/fcm/admin";
import { sendFcmToUserTokens } from "@/lib/fcm/sendNotifications";
import { SITE_URL } from "@/lib/site";
import { sendEmail } from "@/lib/waitlist/notifications";

export async function sendReengagementPush(
  userId: string,
  title: string,
  body: string,
  kind: "reengagement_d1" | "reengagement_d2",
): Promise<boolean> {
  const sdk = tryGetFirebaseMessaging();
  if (!sdk.ok) return false;
  try {
    const result = await sendFcmToUserTokens(sdk.messaging, userId, {
      title,
      body,
      data: { kind, path: "/syllabus" },
    });
    return result.sent > 0;
  } catch {
    return false;
  }
}

export async function sendReengagementEmail(
  email: string,
  subject: string,
  html: string,
): Promise<void> {
  await sendEmail(email, subject, html);
}

export function reengagementD1Copy(examLabel: string): { pushTitle: string; pushBody: string; emailSubject: string; emailHtml: string } {
  const exam = examLabel.trim() || "your exam";
  const pushTitle = "Your projection is waiting";
  const pushBody = `Tick a few ${exam} chapters — see your marks estimate climb.`;
  const emailSubject = "Your Kalnehi projection is still at zero";
  const emailHtml = `
<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h2 style="font-size:20px;font-weight:600">You started Kalnehi yesterday.</h2>
  <p style="color:#555;line-height:1.5">
    Open your syllabus, tick chapters you've already covered, and watch your projected ${exam} score move.
    It takes about 60 seconds.
  </p>
  <a href="${SITE_URL}/syllabus?activation=1"
     style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;border-radius:99px;text-decoration:none;font-weight:700;margin:16px 0">
    See my projection →
  </a>
</div>`;
  return { pushTitle, pushBody, emailSubject, emailHtml };
}

export function reengagementD2Copy(examLabel: string): { pushTitle: string; pushBody: string; emailSubject: string; emailHtml: string } {
  const exam = examLabel.trim() || "your exam";
  const pushTitle = "3 chapters can move your rank band";
  const pushBody = `Your ${exam} blueprint is ready — one quick syllabus session.`;
  const emailSubject = "Still planning to prep seriously?";
  const emailHtml = `
<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h2 style="font-size:20px;font-weight:600">Consistency beats cramming.</h2>
  <p style="color:#555;line-height:1.5">
    Students who tick syllabus daily see their projected score climb week over week.
    Spend two minutes marking what you know for ${exam}.
  </p>
  <a href="${SITE_URL}/syllabus"
     style="display:inline-block;background:#ff7a00;color:#fff;padding:12px 24px;border-radius:99px;text-decoration:none;font-weight:700;margin:16px 0">
    Open syllabus tracker →
  </a>
</div>`;
  return { pushTitle, pushBody, emailSubject, emailHtml };
}
