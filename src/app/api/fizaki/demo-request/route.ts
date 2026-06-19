import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import { NextResponse } from "next/server";

import { assertSameOrigin } from "@/lib/assertSameOrigin";
import { fizakiConfig } from "@/verticals/fizaki.config";

export const runtime = "nodejs";

function getRedis(): Redis {
  const url = process.env.KV_REST_API_URL?.trim();
  const token = process.env.KV_REST_API_TOKEN?.trim();
  if (!url || !token) {
    throw new Error(
      "[fizaki/demo-request] KV_REST_API_URL and KV_REST_API_TOKEN must be set",
    );
  }
  return new Redis({ url, token });
}

const MAX_BODY_BYTES = 16_000;
const MAX_NAME = 120;
const MAX_EMAIL = 320;
const MAX_COMPANY = 160;
const MAX_TEAM_SIZE = 40;
const MAX_MESSAGE = 2000;

const WINDOW_MS = 15 * 60 * 1000;
const WINDOW_S = Math.ceil(WINDOW_MS / 1000);
const MAX_IN_WINDOW = 4;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u;

function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

async function allowRequest(key: string): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const redisKey = `fizaki_demo_rl:${key}`;
  const member = now.toString();

  const pipeline = getRedis().pipeline();
  pipeline.zremrangebyscore(redisKey, "-inf", windowStart);
  pipeline.zadd(redisKey, { score: now, member });
  pipeline.zcount(redisKey, windowStart, "+inf");
  pipeline.expire(redisKey, WINDOW_S);

  const results = await pipeline.exec();
  const count = results[2] as number;
  return count <= MAX_IN_WINDOW;
}

function trimStr(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

function demoInbox(): string | null {
  return (
    process.env.FIZAKI_DEMO_TO?.trim() ||
    process.env.CONTACT_SUPPORT_TO?.trim() ||
    null
  );
}

export async function POST(req: Request) {
  const denied = assertSameOrigin(req);
  if (denied) return denied;

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
  const formHpHoneypot = trimStr(o.form_hp, 240);
  if (formHpHoneypot.length > 0) {
    return NextResponse.json(
      { ok: false, error: "Could not send your request. Try again." },
      { status: 400 },
    );
  }

  const name = trimStr(o.name, MAX_NAME);
  const email = trimStr(o.email, MAX_EMAIL).toLowerCase();
  const company = trimStr(o.company, MAX_COMPANY);
  const teamSize = trimStr(o.teamSize, MAX_TEAM_SIZE);
  const message = trimStr(o.message, MAX_MESSAGE);

  if (!name) {
    return NextResponse.json(
      { ok: false, error: "Please enter your name." },
      { status: 400 },
    );
  }
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid work email." },
      { status: 400 },
    );
  }
  if (!company) {
    return NextResponse.json(
      { ok: false, error: "Please enter your company name." },
      { status: 400 },
    );
  }

  const throttleKey = clientIp(req);
  let rateLimitPassed = true;
  try {
    rateLimitPassed = await allowRequest(throttleKey);
  } catch (e) {
    console.error("[fizaki/demo-request] rate-limit backend unavailable:", e);
  }
  if (!rateLimitPassed) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = demoInbox();
  const from = process.env.RESEND_FROM?.trim();

  if (!apiKey || !to || !from) {
    console.error(
      "[fizaki/demo-request] Missing RESEND_API_KEY, FIZAKI_DEMO_TO/CONTACT_SUPPORT_TO, or RESEND_FROM",
    );
    return NextResponse.json(
      {
        ok: false,
        error: "Demo requests are not configured. Please try again later.",
      },
      { status: 503 },
    );
  }

  const brand = fizakiConfig.brand.productName;
  const textLines = [
    `Demo request — ${brand}`,
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Company: ${company}`,
    teamSize ? `Team size: ${teamSize}` : "Team size: (not provided)",
    "",
    message || "(no message)",
  ];

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: [to],
    replyTo: email,
    subject: `[${brand}] Demo request — ${company}`,
    text: textLines.join("\n"),
  });

  if (error) {
    console.error("[fizaki/demo-request] Resend error", error);
    return NextResponse.json(
      { ok: false, error: "Could not send your request. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
