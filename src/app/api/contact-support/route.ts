import { Resend } from "resend";
import { NextResponse } from "next/server";

import {
  contactSupportSubjectLabel,
  isContactSupportSubject,
  type ContactSupportSubjectValue,
} from "@/lib/contactSupport";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SITE_NAME } from "@/lib/seo-metadata";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 24_000;
const MIN_MESSAGE = 10;
const MAX_MESSAGE = 8_000;
const MAX_NAME = 120;
const MAX_EMAIL = 320;

/**
 * Sliding-window throttle per key (best-effort; resets on cold start).
 * Stricter for anonymous traffic; signed-in users get a higher cap.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_IN_WINDOW_ANON = 4;
const MAX_IN_WINDOW_AUTH = 12;
const hits = new Map<string, number[]>();

function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

function allowRequest(key: string, maxInWindow: number): boolean {
  const now = Date.now();
  const prev = hits.get(key) ?? [];
  const recent = prev.filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length <= maxInWindow;
}

const EMAIL_RE =
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u;

function trimStr(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

export async function POST(req: Request) {
  const rawLen = Number(req.headers.get("content-length") ?? 0);
  if (rawLen > MAX_BODY_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Request too large." },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Invalid payload." },
      { status: 400 },
    );
  }

  const o = body as Record<string, unknown>;
  // Prefer `form_hp` (client sends this); accept legacy `website` for older clients.
  const formHpHoneypot = trimStr(o.form_hp, 240) || trimStr(o.website, 240);
  if (formHpHoneypot.length > 0) {
    return NextResponse.json(
      { ok: false, error: "Could not send your message. Try again." },
      { status: 400 },
    );
  }

  const name = trimStr(o.name, MAX_NAME);
  const email = trimStr(o.email, MAX_EMAIL).toLowerCase();
  const subjectRaw = trimStr(o.subject, 64);
  const message = trimStr(o.message, MAX_MESSAGE);

  if (!name) {
    return NextResponse.json(
      { ok: false, error: "Please enter your name." },
      { status: 400 },
    );
  }
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid email address." },
      { status: 400 },
    );
  }
  if (!isContactSupportSubject(subjectRaw)) {
    return NextResponse.json(
      { ok: false, error: "Please choose a subject." },
      { status: 400 },
    );
  }
  const subject = subjectRaw as ContactSupportSubjectValue;
  if (message.length < MIN_MESSAGE) {
    return NextResponse.json(
      {
        ok: false,
        error: `Please enter a message (at least ${MIN_MESSAGE} characters).`,
      },
      { status: 400 },
    );
  }

  let sessionUserId: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    sessionUserId = user?.id ?? null;
  } catch {
    sessionUserId = null;
  }

  const throttleKey = `${clientIp(req)}:${sessionUserId ?? "anon"}`;
  const maxHits = sessionUserId ? MAX_IN_WINDOW_AUTH : MAX_IN_WINDOW_ANON;
  if (!allowRequest(throttleKey, maxHits)) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.CONTACT_SUPPORT_TO?.trim();
  const from = process.env.RESEND_FROM?.trim();

  if (!apiKey || !to || !from) {
    console.error(
      "[contact-support] Missing RESEND_API_KEY, CONTACT_SUPPORT_TO, or RESEND_FROM",
    );
    return NextResponse.json(
      {
        ok: false,
        error: "Support email is not configured. Please try again later.",
      },
      { status: 503 },
    );
  }

  const subjectLabel = contactSupportSubjectLabel(subject);
  const emailSubject = `[${SITE_NAME}] ${subjectLabel}`;

  const textLines = [
    `Subject: ${subjectLabel}`,
    `From: ${name} <${email}>`,
    sessionUserId ? `Signed-in user id: ${sessionUserId}` : "Signed-in user id: (not logged in)",
    "",
    message,
  ];

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: [to],
    replyTo: email,
    subject: emailSubject,
    text: textLines.join("\n"),
  });

  if (error) {
    console.error("[contact-support] Resend error", error);
    return NextResponse.json(
      { ok: false, error: "Could not send your message. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
