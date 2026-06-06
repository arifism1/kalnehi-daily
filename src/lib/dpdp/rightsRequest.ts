import crypto from "node:crypto";
import { Resend } from "resend";

import {
  DPDP_RIGHTS_SLA_DAYS,
  type DpdpRightsRequestType,
} from "@/lib/dpdp/constants";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/seo-metadata";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import type { Json } from "@/types/supabase";

export function generateRightsReferenceId(): string {
  const suffix = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `DPDP-${Date.now().toString(36).toUpperCase()}-${suffix}`;
}

export function rightsRequestDueAt(from = new Date()): string {
  const due = new Date(from);
  due.setUTCDate(due.getUTCDate() + DPDP_RIGHTS_SLA_DAYS);
  return due.toISOString();
}

export function rightsRequestTypeLabel(type: DpdpRightsRequestType): string {
  switch (type) {
    case "access":
      return "Data access";
    case "correction":
      return "Data correction";
    case "erasure":
      return "Account erasure";
    case "nomination":
      return "Nomination of representative";
    default:
      return type;
  }
}

export async function createRightsRequest(opts: {
  userId: string;
  userEmail: string;
  type: DpdpRightsRequestType;
  requestDetails?: Record<string, unknown>;
}): Promise<
  | { ok: true; referenceId: string; dueAt: string }
  | { ok: false; error: string }
> {
  const svc = getSupabaseServiceRoleClient();
  if (!svc) {
    return { ok: false, error: "Service unavailable." };
  }

  if (opts.type === "erasure") {
    const { data: existing, error: dupErr } = await svc
      .from("dpdp_rights_requests")
      .select("id, reference_id")
      .eq("user_id", opts.userId)
      .eq("type", "erasure")
      .in("status", ["pending", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dupErr) {
      console.error("[createRightsRequest] dedup check failed:", dupErr.message);
      return { ok: false, error: "Could not submit your request." };
    }
    if (existing) {
      return {
        ok: false,
        error: `You already have an open deletion request (${existing.reference_id}). We will process it within ${DPDP_RIGHTS_SLA_DAYS} days.`,
      };
    }
  }

  const referenceId = generateRightsReferenceId();
  const dueAt = rightsRequestDueAt();
  const nowIso = new Date().toISOString();

  const requestDetails = (opts.requestDetails ?? {}) as Json;

  const { error } = await svc.from("dpdp_rights_requests").insert({
    user_id: opts.userId,
    reference_id: referenceId,
    type: opts.type,
    status: "pending",
    due_at: dueAt,
    request_details: requestDetails,
    updated_at: nowIso,
  });

  if (error) {
    console.error("[createRightsRequest] insert failed:", error.message);
    return { ok: false, error: "Could not submit your request." };
  }

  await sendRightsAcknowledgementEmail({
    to: opts.userEmail,
    referenceId,
    type: opts.type,
    dueAt,
  });

  return { ok: true, referenceId, dueAt };
}

async function sendRightsAcknowledgementEmail(opts: {
  to: string;
  referenceId: string;
  type: DpdpRightsRequestType;
  dueAt: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) {
    console.error("[dpdp-rights] Missing RESEND_API_KEY or RESEND_FROM");
    return;
  }

  const dueDate = new Date(opts.dueAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

  const label = rightsRequestTypeLabel(opts.type);
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: [opts.to],
    replyTo: SUPPORT_EMAIL,
    subject: `[${SITE_NAME}] DPDP request received — ${opts.referenceId}`,
    text: [
      `Hello,`,
      ``,
      `We received your ${label} request under India's Digital Personal Data Protection Act.`,
      ``,
      `Reference ID: ${opts.referenceId}`,
      `We will respond by: ${dueDate} (${DPDP_RIGHTS_SLA_DAYS} days from today).`,
      ``,
      `If you did not submit this request, contact ${SUPPORT_EMAIL} immediately.`,
      ``,
      `— ${SITE_NAME}`,
    ].join("\n"),
  });

  if (error) {
    console.error("[dpdp-rights] Resend error:", error);
  }
}

export async function sendBreachNotificationEmail(opts: {
  to: string;
  description: string;
  incidentId: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) {
    console.error("[dpdp-breach] Missing RESEND_API_KEY or RESEND_FROM");
    return false;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: [opts.to],
    replyTo: SUPPORT_EMAIL,
    subject: `[${SITE_NAME}] Important security notice about your personal data`,
    text: [
      `Hello,`,
      ``,
      `We are writing to inform you of a personal data breach that may affect your ${SITE_NAME} account.`,
      ``,
      `What happened:`,
      opts.description,
      ``,
      `What we are doing:`,
      `We are investigating the incident, have taken steps to contain it, and are notifying affected users as required under the Digital Personal Data Protection Act, 2023.`,
      ``,
      `What you can do:`,
      `- Change your account password if you use email sign-in.`,
      `- Review recent account activity.`,
      `- Contact us at ${SUPPORT_EMAIL} if you notice anything unusual.`,
      ``,
      `Incident reference: ${opts.incidentId}`,
      ``,
      `— ${SITE_NAME}`,
    ].join("\n"),
  });

  if (error) {
    console.error("[dpdp-breach] Resend error:", error);
    return false;
  }
  return true;
}

export async function sendErasureCompletedEmail(opts: {
  to: string;
  referenceId: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!apiKey || !from) {
    console.error("[dpdp-erasure] Missing RESEND_API_KEY or RESEND_FROM");
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: [opts.to],
    replyTo: SUPPORT_EMAIL,
    subject: `[${SITE_NAME}] Account deletion completed — ${opts.referenceId}`,
    text: [
      `Hello,`,
      ``,
      `Your account erasure request (${opts.referenceId}) has been completed.`,
      `Your Kalnehi Daily account and associated personal data have been deleted,`,
      `except records we must retain for legal or tax compliance (such as billing references).`,
      ``,
      `If you did not request this deletion, contact ${SUPPORT_EMAIL} immediately.`,
      ``,
      `— ${SITE_NAME}`,
    ].join("\n"),
  });

  if (error) {
    console.error("[dpdp-erasure] Resend error:", error);
  }
}
