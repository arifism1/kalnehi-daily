import crypto from "node:crypto";
import { type NextRequest, type NextResponse } from "next/server";

export const DPDP_SIGNUP_ATTEST_COOKIE = "dpdp_signup_attest";

const TTL_MS = 15 * 60 * 1000;

export type SignupConsentMethod = "email_otp" | "google_oauth";

type AttestationPayload = {
  exp: number;
  method: SignupConsentMethod;
  email: string | null;
  ageConfirmed: boolean;
  dpdpAgreed: boolean;
};

function attestationSecret(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? null;
}

function signPayload(serialized: string): string | null {
  const secret = attestationSecret();
  if (!secret) return null;
  return crypto.createHmac("sha256", secret).update(serialized).digest("base64url");
}

function encodePayload(payload: AttestationPayload): string | null {
  const serialized = JSON.stringify(payload);
  const sig = signPayload(serialized);
  if (!sig) return null;
  return `${Buffer.from(serialized, "utf8").toString("base64url")}.${sig}`;
}

function decodePayload(value: string): AttestationPayload | null {
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const serialized = Buffer.from(value.slice(0, dot), "base64url").toString("utf8");
  const sig = value.slice(dot + 1);
  const expected = signPayload(serialized);
  if (!expected || sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(serialized) as AttestationPayload;
    if (
      typeof parsed.exp !== "number" ||
      (parsed.method !== "email_otp" && parsed.method !== "google_oauth") ||
      typeof parsed.ageConfirmed !== "boolean" ||
      typeof parsed.dpdpAgreed !== "boolean"
    ) {
      return null;
    }
    if (parsed.email !== null && typeof parsed.email !== "string") return null;
    if (Date.now() > parsed.exp) return null;
    if (!parsed.ageConfirmed || !parsed.dpdpAgreed) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function createSignupAttestationValue(opts: {
  method: SignupConsentMethod;
  email?: string | null;
}): string | null {
  const payload: AttestationPayload = {
    exp: Date.now() + TTL_MS,
    method: opts.method,
    email: opts.email?.trim().toLowerCase() ?? null,
    ageConfirmed: true,
    dpdpAgreed: true,
  };
  return encodePayload(payload);
}

export function readSignupAttestation(req: NextRequest | Request): AttestationPayload | null {
  const raw =
    "cookies" in req && typeof req.cookies?.get === "function"
      ? req.cookies.get(DPDP_SIGNUP_ATTEST_COOKIE)?.value
      : parseCookieHeader(req.headers.get("cookie"), DPDP_SIGNUP_ATTEST_COOKIE);
  if (!raw) return null;
  return decodePayload(raw);
}

function parseCookieHeader(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return undefined;
}

export function verifySignupAttestation(
  req: NextRequest | Request,
  opts: { method: SignupConsentMethod; email?: string | null },
): boolean {
  const payload = readSignupAttestation(req);
  if (!payload) return false;
  if (payload.method !== opts.method) return false;
  const email = opts.email?.trim().toLowerCase() ?? null;
  if (payload.method === "email_otp") {
    if (!email || !payload.email || payload.email !== email) return false;
  }
  return true;
}

export function setSignupAttestationCookie(
  res: NextResponse,
  value: string,
): void {
  res.cookies.set(DPDP_SIGNUP_ATTEST_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(TTL_MS / 1000),
  });
}

export function clearSignupAttestationCookie(res: NextResponse): void {
  res.cookies.set(DPDP_SIGNUP_ATTEST_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
