import { readFileSync } from "node:fs";
import { join } from "node:path";

import { NextResponse } from "next/server";

import { buildFcmBackgroundInjection } from "@/lib/service-worker/fcmBackgroundInjection";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MARKER = "/* __KALNEHI_FCM_INJECT__ */";

export async function GET() {
  const basePath = join(process.cwd(), "src", "service-worker", "kalnehi-sw.js");
  let body = readFileSync(basePath, "utf8");
  const fcm = buildFcmBackgroundInjection();
  if (body.includes(MARKER)) {
    body = body.replace(MARKER, fcm);
  } else {
    body = `${body.trimEnd()}\n${fcm}`;
  }

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
