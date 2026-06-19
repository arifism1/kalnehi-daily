/**
 * Vertical resolution — PURE, no Next.js deps, never throws.
 *
 * Precedence (see REFRACTOR_PLAN.md section 1 + review item #7):
 *   1. HOST is the source of truth in production (www.kalnehi.com vs www.fizaki.in).
 *   2. NEXT_PUBLIC_VERTICAL is the local-dev / per-Vercel-project build fallback.
 *   3. Unknown host (preview *.vercel.app, apex, localhost) -> env -> DEFAULT.
 *
 * Returning a value is mandatory; an unrecognized host must never error or leak the
 * wrong brand — it falls back to the project's build vertical, else the default.
 */
import {
  DEFAULT_VERTICAL_ID,
  isVerticalId,
  type VerticalId,
} from "@/verticals";

/** Host substrings that map to each vertical (covers apex + www + bare + local dev). */
const HOST_MATCHERS: Record<VerticalId, RegExp> = {
  kalnehi: /(^|\.)kalnehi\.(com|local|test)$/i,
  fizaki: /(^|\.)fizaki\.(in|local|test)$/i,
};

/** Strips port and lowercases. Returns null for empty/invalid input. */
function normalizeHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const h = host.split(",")[0]?.trim().toLowerCase().split(":")[0];
  return h && h.length > 0 ? h : null;
}

/** Resolve from host only. Returns null when no known brand domain matches. */
export function resolveVerticalFromHost(
  host: string | null | undefined,
): VerticalId | null {
  const h = normalizeHost(host);
  if (!h) return null;
  for (const id of Object.keys(HOST_MATCHERS) as VerticalId[]) {
    if (HOST_MATCHERS[id].test(h)) return id;
  }
  return null;
}

/** Build-time vertical from NEXT_PUBLIC_VERTICAL (local/per-project). */
export function getEnvVertical(): VerticalId | null {
  const raw = process.env.NEXT_PUBLIC_VERTICAL;
  return isVerticalId(raw) ? raw : null;
}

/**
 * Build-time vertical for static pages (landing, metadata). Does NOT read request
 * headers — safe for CDN-cached routes. Each Vercel project bakes NEXT_PUBLIC_VERTICAL.
 */
export function getBuildVertical(): VerticalId {
  return getEnvVertical() ?? DEFAULT_VERTICAL_ID;
}

/**
 * Full resolution with fallback chain. Host wins; then env; then default.
 * Never throws, always returns a valid VerticalId.
 */
export function resolveVertical(host?: string | null): VerticalId {
  return (
    resolveVerticalFromHost(host) ?? getEnvVertical() ?? DEFAULT_VERTICAL_ID
  );
}

/** Header name the proxy sets so server components can read the resolved vertical. */
export const VERTICAL_HEADER = "x-vertical";
