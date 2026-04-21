import crypto from "node:crypto";
import type { NextRequest } from "next/server";

/**
 * Verifies the Vercel Cron `Authorization: Bearer <CRON_SECRET>` header using a
 * constant-time comparison to prevent timing oracle attacks.
 *
 * Returns false if CRON_SECRET is unset, the header is missing, or the value
 * does not match. Handles buffer-length mismatch safely (timingSafeEqual would
 * throw if lengths differ, so we check that first).
 */
export function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const auth = req.headers.get("authorization");
  if (!auth) return false;

  const expected = `Bearer ${secret}`;

  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(auth, "utf8");

  if (expectedBuf.length !== actualBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}
